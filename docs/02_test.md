# テスト設計

## テストの種類と目的

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
describe('POST /books', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      title: bookData.title,
      subtitle: bookData.subtitle,
      description: bookData.description,
      pageCount: bookData.pageCount,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should return 400 when title is missing', async () => {
    const invalidData = {
      subtitle: 'サブタイトル'
    };

    await request(app.getHttpServer())
      .post('/books')
      .send(invalidData)
      .expect(400);
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

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **明確な命名**: テスト名は「何をテストしているか」が明確にわかるように
3. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）の構造を守る
4. **適切なモック**: ユニットテストでは外部依存をモック化、統合テストでは実際のDBを使用
5. **エラーケースのテスト**: 正常系だけでなく異常系も必ずテスト
6. **テストデータの再利用**: fixtureを活用してテストデータを管理

## 注意事項

- 統合テストではテスト用のデータベースを使用する
- テスト実行前後でデータベースのクリーンアップを行う
- CIでは全てのテストが自動実行されるように設定する