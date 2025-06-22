# イベント出展管理機能 実装計画書

## 実装計画の概要

技術書典やコミケなどの同人誌即売会への出展申込・管理機能を実装する。
CLAUDE.mdの開発ルールに従い、統合テスト駆動開発（TDD）で段階的に進める。

## 実装の前提条件

### 既存システムとの統合
- **書籍管理システム**: 既存のBooksテーブルと連携
- **執筆者管理システム**: 既存のAuthorsテーブルと連携  
- **ナビゲーション**: 既存のグローバルナビゲーションに統合

### 技術要件
- **アーキテクチャ**: MPA（Multi Page Application）
- **ビューエンジン**: EJS
- **データベース**: PostgreSQL + Drizzle ORM
- **バリデーション**: class-validator（ValidationPipe統一パターン）
- **テスト**: Vitest統合テスト駆動開発

## データベース設計

### 実装テーブル一覧
以下の5つのテーブルを実装予定（設計書は`docs/db/`ディレクトリに完成済み）：

1. **Event（イベント）**: `docs/db/07_event.md`
2. **Circle（サークル）**: `docs/db/08_circle.md`  
3. **Exhibit（出展申込）**: `docs/db/09_exhibit.md`
4. **ExhibitBook（出展書籍）**: `docs/db/10_exhibit_book.md`
5. **CircleAuthor（サークルメンバー）**: `docs/db/11_circle_author.md`

### データベーススキーマ実装順序（修正版）

**段階的スキーマ実装アプローチ** (Phase 1-A完了済み):
```typescript
// ✅ Phase 1-A: 完了済み (eventsテーブル実装済み)
export const events = pgTable('Event', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  eventDate: date('eventDate').notNull(),
  venue: varchar('venue', { length: 255 }).notNull(),
  applicationStartDate: date('applicationStartDate').notNull(),
  applicationEndDate: date('applicationEndDate').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Phase 1-B以降: 残りのテーブル（段階的追加予定）
// export const circles = pgTable('Circle', { /* サークル基本情報 */ });
// export const exhibits = pgTable('Exhibit', { /* 出展申込（eventId, circleId） */ });
// export const exhibitBooks = pgTable('ExhibitBook', { /* 出展書籍（exhibitId, bookId） */ });
// export const circleAuthors = pgTable('CircleAuthor', { /* サークルメンバー（circleId, authorId） */ });
```

**実装状況**: 
- ✅ **eventsテーブル**: 完了 (マイグレーション適用済み)
- ⏳ **circlesテーブル**: Phase 1-B以降で実装予定
- ⏳ **exhibitsテーブル**: Phase 1-B以降で実装予定  
- ⏳ **exhibitBooksテーブル**: Phase 2で実装予定
- ⏳ **circleAuthorsテーブル**: Phase 3で実装予定

**データベース変更優先の理由**:
- マイグレーション失敗リスクを早期に特定
- アプリケーション実装前にDB構造を確定
- 型定義の整合性を事前に確保
- チーム開発での並行作業を可能にする

## Phase 1: 基本機能実装（2-3週間）

### 1-1. イベント管理機能（Events）

**修正された実装順序（データベース変更優先）**:
1. **Phase 1-A: データベーススキーマ実装**
   - 既存スキーマ確認 (`src/db/schema.ts`)
   - Drizzleスキーマ定義追加（eventsテーブル）
   - マイグレーション生成 (`pnpm drizzle:generate`)
   - テスト用DB適用 (`pnpm drizzle:migrate:test`) 
   - プロダクション用DB適用 (`pnpm drizzle:migrate`)
   - 型チェック・Lint確認 (`pnpm type-check`, `pnpm lint`)
   - **コミット実行**

2. **Phase 1-B: アプリケーション実装**
   - 統合テスト作成 (`test/integration/events/`)
   - DTO定義 (`src/events/dto/`)
   - サービス層実装 (`src/events/events.service.ts`)
   - コントローラー実装 (`src/events/events.controller.ts`)
   - ビューファイル作成 (`src/views/events/`)
   - モジュール統合 (`src/events/events.module.ts`)

**Phase 1-A: 実装完了済み** ✅:
```typescript
// 実装済みスキーマ定義 (src/db/schema.ts)
export const events = pgTable('Event', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  eventDate: date('eventDate').notNull(),
  venue: varchar('venue', { length: 255 }).notNull(),
  applicationStartDate: date('applicationStartDate').notNull(),
  applicationEndDate: date('applicationEndDate').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

**実装詳細**:
- テーブル名: `'Event'` (既存パターンに合わせてPascalCase)
- 主キー: `serial('id')` (既存パターンに合わせて)
- カラム名: camelCase (既存パターンに合わせて)
- 型定義: Event, NewEvent をexport済み
- マイグレーションファイル: `drizzle/0006_huge_omega_sentinel.sql`

**Phase 1-A: リスク対策**:
- PostgreSQL接続確認（Docker起動、ポート15432）
- テスト用DBで先に確認してからプロダクション適用
- マイグレーション失敗時は定義修正して再実行
- 既存テーブル（books, printingCompanies等）のパターンを踏襲

**Phase 1-A: 成功指標** ✅ **完了済み**:
- [x] スキーマ定義がschema.tsに正しく追加される
- [x] マイグレーション生成が成功する (`drizzle/0006_huge_omega_sentinel.sql`)
- [x] テスト用DBへの適用が成功する (`pnpm drizzle:migrate:test`)
- [x] プロダクション用DBへの適用が成功する (`pnpm drizzle:migrate`)
- [x] 型チェックエラー0件 (beforeEach import修正完了)
- [x] Lintエラー0件 (import順序修正完了)
- [x] コミットが正常に完了する (コミットハッシュ: `d3020ea`)
- [x] アプリケーション正常起動確認 (ユーザー確認済み)
- [x] 全統合テスト250件通過確認

**URL実装**:
```
GET    /events              # イベント一覧
GET    /events/new          # 新規登録フォーム
POST   /events              # 作成処理
GET    /events/:id          # 詳細表示
GET    /events/:id/edit     # 編集フォーム
PUT    /events/:id          # 更新処理
DELETE /events/:id          # 削除処理
```

### 1-2. サークル管理機能（Circles）

**実装順序**: イベント管理と同様のパターン

**URL実装**:
```
GET    /circles             # サークル一覧
GET    /circles/new         # 新規登録フォーム
POST   /circles             # 作成処理
GET    /circles/:id         # 詳細表示
GET    /circles/:id/edit    # 編集フォーム
PUT    /circles/:id         # 更新処理
DELETE /circles/:id         # 削除処理
```

### 1-3. 出展申込機能（Exhibits）

**実装順序**: 
1. 統合テスト作成（外部キー関連のJOIN処理含む）
2. Drizzleスキーマ定義（eventsとcirclesとの関連）
3. DTO定義（ステータス管理、スペース情報）
4. サービス層実装（JOIN処理、ステータス更新）
5. コントローラー実装
6. ビューファイル作成
7. モジュール統合

**URL実装**:
```
GET    /exhibits            # 出展申込一覧
GET    /exhibits/new        # 新規申込フォーム
POST   /exhibits            # 申込処理
GET    /exhibits/:id        # 申込詳細
GET    /exhibits/:id/edit   # 申込編集フォーム
PUT    /exhibits/:id        # 申込更新処理
DELETE /exhibits/:id        # 申込削除処理
```

## Phase 2: 関連機能実装（2-3週間）

### 2-1. イベント別出展管理

**URL実装**:
```
GET    /events/:eventId/exhibits      # イベント別出展一覧
GET    /events/:eventId/exhibits/new  # イベントへの新規申込
POST   /events/:eventId/exhibits      # イベントへの申込作成
```

**実装内容**:
- イベント詳細画面からの出展申込管理
- 申込状況の集計表示（申込数、当選数、落選数）
- 申込期間チェック機能

### 2-2. サークル別出展管理

**URL実装**:
```
GET    /circles/:circleId/exhibits     # サークル別出展履歴
GET    /circles/:circleId/exhibits/new # サークルからの新規申込
POST   /circles/:circleId/exhibits     # サークルからの申込作成
```

**実装内容**:
- サークル詳細画面からの出展履歴管理
- 過去の出展実績表示
- 申込可能なイベント一覧表示

### 2-3. 出展書籍管理（ExhibitBooks）

**URL実装**:
```
GET    /exhibits/:exhibitId/books               # 出展の頒布書籍一覧
GET    /exhibits/:exhibitId/books/add           # 頒布書籍追加
POST   /exhibits/:exhibitId/books               # 頒布書籍追加処理
PUT    /exhibits/:exhibitId/books/:bookId       # 頒布情報更新
DELETE /exhibits/:exhibitId/books/:bookId       # 頒布書籍削除
```

**実装内容**:
- 出展申込と書籍の多対多関連管理
- 頒布予定数、価格設定
- 表示順序管理

## Phase 3: 高度機能実装（2-3週間）

### 3-1. サークルメンバー管理（CircleAuthors）

**URL実装**:
```
GET    /circles/:circleId/members              # サークルメンバー一覧
GET    /circles/:circleId/members/add          # メンバー追加
POST   /circles/:circleId/members              # メンバー追加処理
PUT    /circles/:circleId/members/:authorId    # メンバー情報更新
DELETE /circles/:circleId/members/:authorId    # メンバー削除
```

**実装内容**:
- サークルと執筆者の多対多関連管理
- 役割管理（代表者、メンバー、ゲスト等）
- 既存のAuthorsテーブルとの統合

### 3-2. 集計・分析機能

**実装内容**:
- イベント別申込状況集計
- サークル別出展実績分析
- 書籍別頒布実績分析
- 収支予測機能

### 3-3. ナビゲーション統合

**実装内容**:
- グローバルナビゲーションにイベント管理機能追加
- 書籍詳細画面からの出展情報表示
- ブレッドクラム機能追加

## 技術実装の詳細

### DTO設計パターン

**ValidationPipe統一パターンの適用**:
```typescript
export class CreateEventDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'イベント名は必須です' })
  @IsString({ message: 'イベント名は文字列で入力してください' })
  @MaxLength(255, { message: 'イベント名は255文字以内で入力してください' })
  name: string;

  @IsNotEmpty({ message: '開催日は必須です' })
  @IsDateString({}, { message: '開催日には有効な日付を入力してください' })
  eventDate: string;

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '会場名は必須です' })
  @IsString({ message: '会場名は文字列で入力してください' })
  @MaxLength(255, { message: '会場名は255文字以内で入力してください' })
  venue: string;

  @IsNotEmpty({ message: '申込開始日は必須です' })
  @IsDateString({}, { message: '申込開始日には有効な日付を入力してください' })
  applicationStartDate: string;

  @IsNotEmpty({ message: '申込締切日は必須です' })
  @IsDateString({}, { message: '申込締切日には有効な日付を入力してください' })
  applicationEndDate: string;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  description?: string;
}
```

### サービス層設計パターン

**既存パターンの踏襲**:
```typescript
@Injectable()
export class EventsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  // 印刷所機能のfindAll()パターンを参考
  async findAll() {
    return await this.drizzleService.db
      .select()
      .from(events)
      .orderBy(desc(events.eventDate));
  }

  // 印刷所機能のfindOne()パターンを参考
  async findOne(id: number) {
    const result = await this.drizzleService.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('イベントが見つかりません');
    }

    return result[0];
  }

  // JOIN処理パターン（入稿機能を参考）
  async findEventWithExhibits(id: number) {
    return await this.drizzleService.db
      .select({
        eventId: events.id,
        eventName: events.name,
        eventDate: events.eventDate,
        venue: events.venue,
        exhibitId: exhibits.id,
        circleName: circles.name,
        exhibitStatus: exhibits.status,
      })
      .from(events)
      .leftJoin(exhibits, eq(events.id, exhibits.eventId))
      .leftJoin(circles, eq(exhibits.circleId, circles.id))
      .where(eq(events.id, id))
      .orderBy(exhibits.applicationDate);
  }
}
```

### テスト実装パターン

**統合テスト駆動開発**:
```typescript
describe('Events Integration Tests', () => {
  let app: INestApplication;
  let drizzleService: DrizzleService;

  beforeAll(async () => {
    // アプリケーション初期化
  });

  afterAll(async () => {
    await testDbUtils.closeConnection();
    await app.close();
  });

  beforeEach(async () => {
    // 業界標準のbeforeEchのみパターン（統一済み）
    await testDbUtils.cleanupDatabase();
    
    // テスト用データ作成
    // ...
  });

  describe('GET /events', () => {
    it('イベント一覧が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);

      expect(response.text).toContain('イベント一覧');
      expect(response.text).toContain('技術書典17');
    });
  });

  describe('POST /events', () => {
    it('新規イベントが作成される', async () => {
      const eventData = {
        name: '技術書典18',
        eventDate: '2024-12-07',
        venue: '東京ビッグサイト',
        applicationStartDate: '2024-09-01',
        applicationEndDate: '2024-09-30',
        description: 'テストイベント',
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .send(eventData)
        .expect(302); // リダイレクト

      // データベース確認
      const events = await drizzleService.db.select().from(eventsTable);
      expect(events).toHaveLength(2); // 初期データ + 新規作成
      expect(events[1].name).toBe('技術書典18');
    });
  });
});
```

## 実装スケジュール

### ✅ 完了: Phase 1-A データベーススキーマ実装
- [x] **Phase 1-A: eventsテーブルスキーマ実装とマイグレーション完了**
  - [x] 既存スキーマ確認 (30分) - 既存パターンを踏襲したスキーマ設計
  - [x] Drizzleスキーマ定義追加 (60分) - PascalCaseテーブル名、camelCaseカラム名
  - [x] マイグレーション生成・適用 (30分) - テスト用・プロダクション用両方成功
  - [x] 型チェック・Lint確認 (15分) - beforeEach import修正でエラー解消
  - [x] コミット実行 (15分) - コミットハッシュ: `d3020ea`
  - **実際の所要時間**: 約2.5時間 (計画通り)
  - **完了日時**: 2025年6月22日 21:40
  - **成果物**: eventsテーブル, マイグレーションファイル, 型定義

### Week 1-2: Phase 1 基本機能
- [ ] **Phase 1-B: イベント管理アプリケーション実装完成**
- [ ] サークル管理機能完成  
- [ ] 出展申込基本機能完成

### Week 3-4: Phase 2 関連機能
- [ ] イベント別出展管理完成
- [ ] サークル別出展管理完成
- [ ] 出展書籍管理完成

### Week 5-6: Phase 3 高度機能
- [ ] サークルメンバー管理完成
- [ ] 集計・分析機能完成
- [ ] ナビゲーション統合完成

### Week 7: 統合テスト・リファクタリング
- [ ] E2Eテスト実装
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備

## 成功指標

### 技術指標
- [ ] 統合テスト300件以上実装・全通過
- [ ] 型安全性100%（TypeScriptエラー0件）
- [ ] Lintエラー0件
- [ ] ValidationPipe統一パターン100%適用

### 機能指標
- [ ] 全CRUD操作正常動作
- [ ] 外部キー制約適切動作
- [ ] エラーハンドリング完全動作
- [ ] レスポンシブ対応完成

### ユーザビリティ指標
- [ ] 直感的なナビゲーション
- [ ] エラーメッセージの分かりやすさ
- [ ] データ入力の効率性
- [ ] 既存機能との一貫性

## リスク要因と対策

### 技術リスク
- **多対多関係の複雑性**: 段階的実装で複雑性を管理
- **パフォーマンス問題**: JOIN処理の最適化とインデックス設計
- **データ整合性**: 外部キー制約とトランザクション管理

### スケジュールリスク
- **実装範囲の拡大**: Phase分割で段階的進行
- **テスト工数増加**: 既存パターン踏襲で効率化
- **統合時の問題**: 早期統合テストで問題検出

### 対策
- 既存機能パターンの最大活用
- 統合テスト駆動開発の徹底
- 段階的リリースによるリスク分散

## まとめ

本実装計画書は、既存システムとの一貫性を保ちながら、同人誌即売会出展管理機能を段階的に実装するためのロードマップです。ValidationPipe統一パターン、TDD、データベースクリーンアップ戦略など、これまでに確立された開発パターンを最大限活用し、高品質な機能追加を実現します。