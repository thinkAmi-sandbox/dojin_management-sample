# 統合テストのベストプラクティス

このドキュメントは、NestJSアプリケーションにおける統合テストのベストプラクティスをまとめたものです。特に、フレーキーなテスト（不安定なテスト）を防ぐための重要な指針を提供します。

## 1. テストの独立性確保（最重要）

### ❌ 避けるべきパターン

```typescript
describe('Book Authors Management', () => {
  let testBookId: number;
  let testAuthorId: number;
  
  // ❌ beforeAllで共有データを作成
  beforeAll(async () => {
    const book = await createBook('共有書籍');
    testBookId = book.id;
    
    const author = await createAuthor('共有執筆者');
    testAuthorId = author.id;
  });
  
  // 各テストが同じデータを参照...
  it('test1', () => { /* testBookIdを使用 */ });
  it('test2', () => { /* testBookIdを使用 */ });
});
```

**問題点**:
- テスト間でデータが共有され、相互に影響する
- 並列実行時にデータ競合が発生
- 一つのテストの失敗が他のテストに波及

### ✅ 推奨パターン

```typescript
describe('Book Authors Management', () => {
  let app: INestApplication;
  let drizzleService: DrizzleService;
  let testBookId: number;
  let testAuthorId: number;
  
  beforeAll(async () => {
    // アプリケーションの初期化のみ
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    setupTestApp(app);
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
    await app.init();
  });
  
  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ
    await testDbUtils.cleanupDatabase();
    
    // 各テストで独自のデータを作成
    const timestamp = Date.now();
    
    const book = await drizzleService.db
      .insert(schema.books)
      .values({
        title: `テスト書籍_${timestamp}`,
        subtitle: `サブタイトル_${timestamp}`,
      })
      .returning();
    testBookId = book[0].id;
    
    const author = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: `テスト執筆者_${timestamp}`,
        email: `test-${timestamp}@example.com`,
      })
      .returning();
    testAuthorId = author[0].id;
  });
  
  afterEach(async () => {
    // 各テスト後に全データをクリーンアップ
    await testDbUtils.cleanupDatabase();
  });
  
  afterAll(async () => {
    await testDbUtils.closeConnection();
    await app.close();
  });
});
```

## 2. ユニークなテストデータの生成

### タイムスタンプを活用

```typescript
const timestamp = Date.now();

// ユニークな書籍タイトル
const bookTitle = `テスト書籍_${timestamp}`;

// ユニークなメールアドレス（unique制約対策）
const email = `test-${timestamp}@example.com`;

// ユニークな執筆者名
const authorName = `執筆者_${timestamp}`;
```

### UUID を活用（より厳密な一意性が必要な場合）

```typescript
import { randomUUID } from 'crypto';

const uniqueId = randomUUID().slice(0, 8);
const email = `test-${uniqueId}@example.com`;
```

## 3. データクリーンアップ戦略

### 完全クリーンアップの推奨

```typescript
// ✅ 推奨: 全テーブルを確実にクリーンアップ
afterEach(async () => {
  await testDbUtils.cleanupDatabase();
});
```

### 部分的クリーンアップの問題点

```typescript
// ❌ 非推奨: 部分的なクリーンアップ
afterEach(async () => {
  await drizzleService.db.delete(schema.bookAuthors); // 中間テーブルのみ
  // → 外部キー制約エラーの原因になる
});
```

## 4. データベース接続の管理

### 単一の接続を使用

```typescript
// ✅ 良い: NestJSアプリ内のDrizzleServiceを使用
const drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
await drizzleService.db.insert(schema.books).values(testData);

// ❌ 悪い: 独自の接続を作成
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);
await db.insert(schema.books).values(testData);
```

## 5. よくある問題と解決策

### 外部キー制約違反

**症状**: `violates foreign key constraint "BookAuthor_bookId_Book_id_fk"`

**原因**: 
- beforeAllで作成したデータが途中で削除された
- 部分的なクリーンアップで親データが削除された

**解決策**: 
- beforeEachで必要なデータを毎回作成
- afterEachで全データをクリーンアップ

### ユニーク制約違反

**症状**: `duplicate key value violates unique constraint "Author_email_unique"`

**原因**: 
- 固定のメールアドレスを使用
- 前のテストのデータが残存

**解決策**: 
- タイムスタンプベースのユニークなメールアドレス生成
- 確実なデータクリーンアップ

### テストのランダムな失敗

**症状**: 
- 単体実行では成功するが、全体実行で失敗
- 実行順序によって結果が変わる

**原因**: 
- テスト間のデータ依存
- 不完全なクリーンアップ

**解決策**: 
- 各テストの完全な独立性確保
- beforeEach/afterEachパターンの徹底

## 6. テスト設定の最適化

### vitest.config.integration.ts の推奨設定

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration.spec.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 順次実行で安定性確保
      },
    },
  },
});
```

## 7. デバッグのヒント

### テストデータの確認

```typescript
// デバッグ用: 作成されたデータを確認
console.log('Created test data:', {
  bookId: testBookId,
  authorId: testAuthorId,
  timestamp: new Date(timestamp).toISOString()
});
```

### クリーンアップの確認

```typescript
// デバッグ用: クリーンアップ後のデータ数を確認
const bookCount = await drizzleService.db.select().from(schema.books);
console.log('Books after cleanup:', bookCount.length);
```

## まとめ

1. **各テストを完全に独立させる** - beforeEachでデータ作成、afterEachでクリーンアップ
2. **ユニークなテストデータを生成** - タイムスタンプや UUID を活用
3. **完全なクリーンアップを実行** - 部分的なクリーンアップは避ける
4. **単一のDB接続を使用** - アプリケーション内の接続を再利用
5. **順次実行で安定性確保** - 並列実行による競合を防ぐ

これらのベストプラクティスに従うことで、安定した信頼性の高い統合テストを実現できます。

## 8. テストファイル作成時の型設定とimport文の管理

### 必須のimport文パターン

新規テストファイル作成時は、必ず以下のimport文を記述してください：

```typescript
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'
```

### 重要：Vitestテスト関数の明示的import

**❌ 禁止パターン**:
```typescript
// import文なしでdescribe, it, expectを使用
describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true)  // ← 型エラーが発生する場合がある
  })
})
```

**✅ 必須パターン**:
```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true)  // ← 確実に型解決される
  })
})
```

### 型解決問題の背景

#### 問題の原因
- `tsconfig.test.json` の `"types": ["vitest/globals"]` 設定が原因
- TypeScriptの `types` 配列は `@types/パッケージ名` 形式を期待する
- `vitest/globals` は直接パッケージパス指定のため型解決できない

#### 解決方法
1. **tsconfig.test.json修正済み**: `"vitest/globals"` を削除
2. **明示的import必須**: 全テストファイルでVitest関数をimport

#### エラー例
```
Error:(16, 1) TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
```

### 型エラー発生時の調査手順

#### 1. IDEでエラー表示された場合
```bash
# TypeScript型チェックを実行
tsc --noEmit --project tsconfig.test.json
```

#### 2. 既存ファイルとの比較確認
- 他の統合テストファイルのimport文を参考にする
- 特に `test/integration/` 内の他ファイルを確認

#### 3. 修正方法
```typescript
// 対象ファイルの先頭に追加
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
```

### 予防策

#### 新規ファイル作成時のチェックリスト
- [ ] Vitestテスト関数の明示的import実装
- [ ] 型チェック実行（`tsc --noEmit --project tsconfig.test.json`）
- [ ] 既存テストファイルのimportパターンとの整合性確認

#### エディタ設定の推奨
- TypeScriptのstrictモード有効化
- リアルタイム型チェック有効化
- import文の自動補完機能活用

これらのガイドラインに従うことで、テストファイル作成時の型関連問題を防ぎ、開発効率を向上させることができます。

## 9. Phase 2-2教訓に基づく追加ベストプラクティス

### it.skip()使用時のガバナンス強化

#### ❌ 避けるべきパターン
```typescript
it.skip('必須項目が空の場合はバリデーションエラーを表示する', async () => {
  // TODO: ValidationExceptionFilterの在庫管理対応を後で修正
  // ← 解決期限・具体的な解決方法・担当者が不明確
})
```

**問題点**:
- 解決期限が設定されていない
- 具体的な解決方法が不明
- 技術的問題の優先度が曖昧
- 品質低下（未テスト機能の残存）

#### ✅ 推奨パターン
```typescript
// 技術的制約により一時的にスキップする場合
it.skip('必須項目が空の場合はバリデーションエラーを表示する', async () => {
  // FIXME: @Redirect + ValidationPipe競合問題により一時的にスキップ
  // 解決期限: 2025-06-28中 (当日解決必須)
  // 解決方法: DTO型をstring化 + サービス層数値変換
  // 参考: docs/development-lessons/phase-2-2-lessons.md
  // 担当: Claude Code
  // 優先度: 高（ValidationExceptionFilter関連は最高優先度）
})
```

**改善点**:
- 具体的な解決期限を明記
- 技術的解決方法を文書化
- 参考資料への明確な参照
- 優先度の明確化

### ValidationExceptionFilter統合テスト

#### @Redirect競合問題の回避策

**問題の背景**:
- @Redirectデコレータが ValidationExceptionFilter より優先実行される
- バリデーションエラー時も強制的に302リダイレクトが発生
- 期待する200ステータス（エラーHTML表示）が得られない

**解決アプローチ**:

#### 1. DTO設計時の型選択
```typescript
// ✅ 推奨: UI入力フィールドはstring型を優先
export class CreateResourceDto {
  @Transform(({ value }) => value?.toString()?.trim())
  @IsNotEmpty({ message: 'IDは必須です' })
  @IsString({ message: 'IDは文字列で入力してください' })
  resourceId: string // ← string型採用
}

// ❌ 避ける: 複雑な数値変換 + @Redirect組み合わせ
export class CreateResourceDto {
  @Transform(({ value }) => value !== '' ? Number.parseInt(value, 10) : 0)
  @IsNotEmpty({ message: 'IDは必須です' })
  @IsInt({ message: 'IDは整数で入力してください' })
  resourceId: number // ← @Redirectとの組み合わせで競合
}
```

#### 2. サービス層での数値変換
```typescript
async create(dto: CreateResourceDto) {
  // DTO受け取り後に数値変換
  const resourceId = Number.parseInt(dto.resourceId, 10)
  
  // バリデーション
  if (isNaN(resourceId)) {
    throw new Error('リソースIDが無効です')
  }
  
  // 処理継続...
}
```

#### 3. テスト期待値の調整
```typescript
// ✅ ValidationExceptionFilter対応テスト
it('必須項目が空の場合はバリデーションエラーを表示する', async () => {
  const response = await request(app.getHttpServer())
    .post('/resources')
    .send({ resourceId: '' })

  // ValidationExceptionFilterにより200でエラーHTML返却
  expect(response.status).toBe(200)
  expect(response.text).toContain('IDは必須です')
})
```

### it.skip()使用ルールの強化

#### 使用制限
1. **明確な解決期限設定を義務化**
   - 当日解決必須: ValidationExceptionFilter関連、型安全性問題
   - 当日解決推奨: HTTPメソッドオーバーライド問題
   - 翌日可: HTMLレンダリング軽微問題

2. **スキップ理由と解決方法の文書化必須**
   - 技術的制約の具体的説明
   - 解決方法の詳細手順
   - 参考資料への明確な参照

3. **優先度の明確化**
   - ValidationExceptionFilter関連は最高優先度
   - 技術的競合問題の先送りは原則禁止

4. **定期的なレビュー**
   - スキップされたテストの解決状況確認
   - 解決期限超過の防止

### 参考資料

#### 詳細な技術的背景と解決策
- **`docs/development-lessons/phase-2-2-lessons.md`**
  - @Redirect + ValidationPipe競合問題の詳細
  - DTO型選択基準のフローチャート
  - 技術的問題の優先度マトリックス

#### 成功実装例
- **storage-locations**: 文字列ベースバリデーション成功例
- **stocks**: @Redirect競合問題解決例

これらの教訓とベストプラクティスに従うことで、Phase 2-2で発生した技術的問題の再発を防ぎ、より効率的で安定した開発プロセスを実現できます。