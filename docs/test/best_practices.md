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