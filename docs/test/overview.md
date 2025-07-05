# テスト設計

## テストの種類と目的

> **重要**: 統合テストのベストプラクティスについては、[best_practices.md](./best_practices.md) も参照してください。

### 1. Unit Test（ユニットテスト）
- **目的**: 個別のクラスやメソッドの動作を検証
- **配置**: `src/` 内の各ファイルと同じディレクトリ
- **命名**: `*.spec.ts`
- **例**: 
  - `src/books/books.service.spec.ts`
  - `src/books/books.controller.spec.ts`
- **テスト対象**:
  - サービスのビジネスロジック
  - コントローラーのルーティングロジック
  - ユーティリティ関数
- **モック**: 外部依存（DB、他サービス）はモック化

### 2. Integration Test（統合テスト）
- **目的**: HTTPリクエスト/レスポンスとDBを含む一連の動作を検証（RSpecのrequest specに相当）
- **配置**: `test/integration/`
- **命名**: `*.integration.spec.ts`
- **例**:
  - `test/integration/books/create-book.integration.spec.ts`
  - `test/integration/books/update-book.integration.spec.ts`
- **テスト対象**:
  - HTTPステータスコード
  - レスポンスボディの構造と内容
  - データベースへの永続化
  - バリデーションエラー
- **特徴**: 実際のDBを使用（テスト用DB）

### 3. E2E Test（エンドツーエンドテスト）
- **目的**: ユーザー視点での完全なシナリオを検証
- **配置**: `e2e/`（プロジェクトルート直下）
- **命名**: `*.e2e.spec.ts`
- **例**:
  - `e2e/user-scenarios/book-management.e2e.spec.ts`
- **テスト対象**:
  - ユーザーの操作フロー全体
  - ブラウザでの表示と動作
  - 複数ページにまたがる処理
- **ツール**: Playwright（将来的に導入予定）

## ディレクトリ構造

```
project-root/
├── src/
│   └── books/
│       ├── books.controller.ts
│       ├── books.controller.spec.ts    # Unit Test
│       ├── books.service.ts
│       └── books.service.spec.ts       # Unit Test
├── test/
│   ├── integration/                    # Integration Tests
│   │   ├── books/
│   │   │   ├── create-book.integration.spec.ts
│   │   │   ├── update-book.integration.spec.ts
│   │   │   ├── delete-book.integration.spec.ts
│   │   │   └── list-books.integration.spec.ts
│   │   ├── authors/
│   │   │   └── authors.integration.spec.ts
│   │   └── deadlines/
│   │       └── deadlines.integration.spec.ts
│   ├── fixtures/                       # テストデータ
│   │   ├── books.fixture.ts
│   │   └── authors.fixture.ts
│   ├── helpers/                        # ヘルパー関数
│   │   ├── test-utils.ts
│   │   └── db-utils.ts
│   └── setup.ts                        # 共通セットアップ
└── e2e/                               # E2E Tests（将来）
    └── user-scenarios/
        └── book-management.e2e.spec.ts
```

## テストの実行方法

### ユニットテスト
```bash
pnpm test                    # 全てのユニットテストを実行
pnpm test:watch             # ウォッチモードで実行
pnpm test:cov               # カバレッジレポート付きで実行
pnpm test books.service     # 特定のファイルのみ実行
```

### 統合テスト
```bash
pnpm test:integration       # 全ての統合テストを実行
pnpm test:integration books # booksに関する統合テストのみ実行
```

### E2Eテスト
```bash
pnpm test:e2e               # 全てのE2Eテストを実行
```

## テストの書き方

### ユニットテストの例
```typescript
// books.service.spec.ts
describe('BooksService', () => {
  let service: BooksService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    const module = Test.createTestingModule({
      providers: [BooksService, mockPrismaClient],
    }).compile();
    
    service = module.get(BooksService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return an array of books', async () => {
      const mockBooks = [{ id: 1, title: 'Test Book' }];
      prisma.book.findMany.mockResolvedValue(mockBooks);
      
      const result = await service.findAll();
      
      expect(result).toEqual(mockBooks);
    });
  });
});
```

### 統合テストの例
```typescript
// create-book.integration.spec.ts
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'

describe('POST /books', () => {
  let app: INestApplication;
  let drizzleService: DrizzleService;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    setupTestApp(app);
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // 重要：NestJSアプリ内のDrizzleServiceを使ってクリーンアップ
    await drizzleService.db.delete(schema.books);
  });

  it('should create a new book', async () => {
    const bookData = {
      title: 'テスト本',
      subtitle: 'サブタイトル',
      description: '説明文',
      pageCount: 100
    };

    const response = await request(app.getHttpServer())
      .post('/books')
      .send(bookData)
      .expect(302); // MPAではリダイレクト

    expect(response.headers.location).toBe('/books');

    // データベースに保存されていることを確認
    const savedBooks = await drizzleService.db.select().from(schema.books);
    expect(savedBooks).toHaveLength(1);
    expect(savedBooks[0].title).toBe(bookData.title);
  });

  it('should return 400 when title is missing', async () => {
    const invalidData = {
      subtitle: 'サブタイトル'
    };

    await request(app.getHttpServer())
      .post('/books')
      .send(invalidData)
      .expect(400);

    // データベースに保存されていないことを確認
    const savedBooks = await drizzleService.db.select().from(schema.books);
    expect(savedBooks).toHaveLength(0);
  });
});
```

## テストデータの管理

### Fixture（テストデータ）の例
```typescript
// test/fixtures/books.fixture.ts
export const bookFixtures = {
  validBook: {
    title: 'はじめてのNestJS',
    subtitle: 'TypeScriptで作るWebアプリケーション',
    description: 'NestJSの基礎から実践まで',
    pageCount: 200
  },
  minimalBook: {
    title: '最小限の本'
  },
  maximalBook: {
    title: '完全な本',
    subtitle: '全ての項目を含む',
    description: '詳細な説明文がここに入ります',
    pageCount: 500
  }
};
```

## ベストプラクティス

### 基本的なテスト原則
1. **テストの独立性**: 各テストは他のテストに依存しない
2. **明確な命名**: テスト名は「何をテストしているか」が明確にわかるように
3. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）の構造を守る
4. **適切なモック**: ユニットテストでは外部依存をモック化、統合テストでは実際のDBを使用
5. **エラーケースのテスト**: 正常系だけでなく異常系も必ずテスト
6. **テストデータの再利用**: fixtureを活用してテストデータを管理

### 統合テスト固有のベストプラクティス

#### 1. テストの独立性確保（最重要）
```typescript
// ❌ 悪い例：beforeAllでデータを作成し、各テストで共有
beforeAll(async () => {
  const book = await createBook(); 
  testBookId = book.id;
});

// ✅ 良い例：各テストで独立したデータを作成
beforeEach(async () => {
  await testDbUtils.cleanupDatabase(); // 完全クリーンアップ
  const timestamp = Date.now();
  const book = await createBook(`テスト書籍_${timestamp}`);
  testBookId = book.id;
});

afterEach(async () => {
  await testDbUtils.cleanupDatabase(); // 完全クリーンアップ
});
```

**理由**: 
- テスト間のデータ競合を防止
- 並列実行時の安定性確保
- メールアドレスなどのユニーク制約違反を回避

#### 2. 一貫したデータベース接続の使用
```typescript
// ❌ 悪い例：独立したデータベース接続を作成
const testDb = drizzle(new Pool({ connectionString: process.env.DATABASE_URL_TEST }));

// ✅ 良い例：NestJSアプリ内のDrizzleServiceを使用
const drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
```

**理由**: 複数のデータベース接続は競合状態を引き起こし、テストが不安定になる

#### 3. 適切なテストデータのクリーンアップ
```typescript
afterEach(async () => {
  // NestJSアプリと同じDrizzleServiceインスタンスでクリーンアップ
  await drizzleService.db.delete(schema.books);
});
```

#### 4. テストデータの挿入もアプリ内サービスを使用
```typescript
// テストデータの作成時もDrizzleServiceを使用
await drizzleService.db.insert(schema.books).values([testData]);
```

#### 5. 順次実行の設定（重要）
```typescript
// vitest.config.integration.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 並行実行を防ぐ
      },
    },
  },
});
```

**理由**: 並行実行時のデータベースアクセス競合を防ぐため

#### 6. テストヘルパーの活用
```typescript
// test/helpers/db-utils.ts で提供されるクリーンアップメソッド
cleanupDatabase()        // 全テーブルの完全クリーンアップ（推奨）
cleanupRelationalData()  // 関連テーブルのみクリーンアップ（非推奨）
cleanupDeadlines()       // 締切テーブルのみクリーンアップ（非推奨）
```

**注意**: 部分的なクリーンアップは外部キー制約エラーの原因となるため、基本的に`cleanupDatabase()`の使用を推奨

## テスト戦略の方針

### モックの使用について
過度なモックはテストの価値を下げるため、以下の方針を採用します：

1. **統合テストを優先**
   - HTTPリクエストからデータベースまでの実際の動作を検証
   - 本番環境に近い状態でのテスト
   - ControllerとServiceの連携を含めた全体的な動作確認

2. **シンプルなCRUD操作**
   - 単純なデータの取得・保存・更新・削除のみの場合
   - → 統合テストのみで十分（ユニットテストは不要）
   - データベースも含めた実際の動作を確認

3. **複雑なビジネスロジックがある場合のみユニットテスト追加**
   - 検索条件の複雑な組み立て
   - データの集計・変換処理
   - 外部APIとの連携ロジック
   - → この場合はServiceのユニットテストを追加

4. **Controllerのユニットテストは基本的に不要**
   - ControllerはServiceを呼び出してビューに渡すだけの薄い層
   - モックだらけになり、実装の詳細に依存しすぎる
   - 統合テストで十分カバー可能

## データベース環境の分離

### 開発用とテスト用データベースの設定

このプロジェクトでは、Railsと同様に開発環境とテスト環境で異なるデータベースを使用します。

#### 環境変数設定
`.env`ファイルに以下の環境変数を設定：

```bash
# 開発用データベース（デフォルト）
DATABASE_URL=postgresql://dojin_user:dojin_password@localhost:15432/dojin_management

# テスト用データベース
DATABASE_URL_TEST=postgresql://dojin_user:dojin_password@localhost:15432/dojin_management_test

# 環境識別子
NODE_ENV=development  # 開発時、テスト時は自動的に'test'に設定
```

#### データベースの初期化と作成

1. **PostgreSQLコンテナの起動**
   ```bash
   docker compose up -d
   ```
   初期化スクリプト（`docker/postgres/init-multiple-databases.sh`）により、開発用とテスト用の両方のデータベースが自動作成されます。

2. **マイグレーションの実行**
   ```bash
   # 開発用データベース
   pnpm drizzle:migrate
   
   # テスト用データベース
   pnpm drizzle:migrate:test
   ```
   
   **注意**: テスト用データベースは `drizzle.config.test.ts` 設定ファイルを使用し、`DATABASE_URL_TEST` 環境変数を参照します。

#### 自動的な環境切り替え

- **開発時**: `NODE_ENV=development`で`dojin_management`データベースを使用
- **テスト時**: `NODE_ENV=test`で`dojin_management_test`データベースを自動使用
- テスト実行時は`test/setup.ts`で自動的に`NODE_ENV=test`が設定される

#### データクリーンアップ

統合テストでは、各テストケース実行後に`test/helpers/db-utils.ts`の`cleanupDatabase()`が自動実行され、テストデータベースをクリーンな状態に保ちます。

## トラブルシューティング

### よくある問題と解決策

#### 1. テストが不安定（時々失敗する）
**症状**: 同じテストが成功したり失敗したりする

**原因**: 並行実行時の競合状態
- 複数のテストが同時にデータベースにアクセス
- 一方のテストでデータを挿入した直後に他方のテストがクリーンアップを実行

**解決策**: 
```typescript
// vitest.config.integration.tsで順次実行を設定
pool: 'forks',
poolOptions: {
  forks: {
    singleFork: true,
  },
},
```

#### 2. テストデータが表示されない
**症状**: データを挿入してもHTTPレスポンスに反映されない

**原因**: 異なるデータベース接続インスタンス
- testDbUtilsとNestJSアプリが別々のデータベース接続を使用

**解決策**:
```typescript
// NestJSアプリ内のDrizzleServiceを直接使用
const drizzleService = moduleRef.get<DrizzleService>(DrizzleService);
await drizzleService.db.insert(schema.books).values([testData]);
```

#### 3. 初期化スクリプトが実行されない
**症状**: テスト用データベースが作成されない

**原因**: Docker ボリュームに既存のデータが存在

**解決策**:
```bash
# ボリュームを削除して再作成
docker compose down -v
docker compose up -d
```

#### 4. 環境変数が正しく設定されない
**症状**: 開発用DBがテストでも使われる

**確認方法**:
```typescript
// DrizzleServiceにログを追加して確認
console.log(`NODE_ENV=${process.env.NODE_ENV}, DATABASE_URL=${databaseUrl}`);
```

#### 5. フレーキーなテスト（ランダムに失敗する）
**症状**: 
- 単体では成功するが、全体実行時に失敗
- 外部キー制約違反エラー（例: `violates foreign key constraint`）
- ユニーク制約違反エラー（例: `duplicate key value violates unique constraint`）

**原因**:
- beforeAllで作成したデータを複数テストで共有
- 部分的なクリーンアップによるデータ残存
- テスト間でのデータ競合

**解決策**:
1. 各テストを完全に独立させる
   ```typescript
   beforeEach(async () => {
     await testDbUtils.cleanupDatabase();
     // 各テストで新しいデータを作成
   });
   ```
2. タイムスタンプを使ったユニークなテストデータ生成
   ```typescript
   const timestamp = Date.now();
   const email = `test-${timestamp}@example.com`;
   ```
3. afterEachで全データをクリーンアップ
   ```typescript
   afterEach(async () => {
     await testDbUtils.cleanupDatabase();
   });
   ```

#### 6. テストファイルで型エラーが発生する
**症状**: 
- IDEで `Cannot find name 'describe'` エラー表示
- `tsc --noEmit --project tsconfig.test.json` でコンパイルエラー
- テスト関数（describe, it, expect等）が未定義エラー

**原因**:
- Vitestテスト関数のimport文が不足
- `tsconfig.test.json` の `"types": ["vitest/globals"]` 設定が型解決できない
- TypeScriptが `@types/パッケージ名` 形式を期待するが、`vitest/globals` は直接パス指定

**解決策**:
1. **必須のimport文を追加**:
   ```typescript
   import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
   ```
2. **既存ファイルとの整合性確認**:
   ```bash
   # 他の統合テストファイルのimport文を参考にする
   grep -r "import.*vitest" test/integration/
   ```
3. **型チェックでの確認**:
   ```bash
   # TypeScript型チェックを実行
   tsc --noEmit --project tsconfig.test.json
   ```

**予防策**:
- 新規テストファイル作成時は必ずVitestテスト関数を明示的にimport
- テンプレートファイルを活用して統一されたimport文を使用
- リアルタイム型チェックを有効にして早期発見

## 注意事項

- 統合テストではテスト用のデータベースを使用する
- テスト実行前後でデータベースのクリーンアップを行う
- CIでは全てのテストが自動実行されるように設定する
- 開発用とテスト用データベースは完全に分離されており、相互に影響しない
- **重要**: 統合テストは順次実行を推奨（並行実行時の競合を避けるため）