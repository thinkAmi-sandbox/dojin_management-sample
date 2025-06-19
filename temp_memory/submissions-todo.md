# 入稿機能 実装TODO

## 実装計画の概要

入稿機能を画面ごとに段階的に実装する。
CLAUDE.mdの開発ルールに従い、各画面ごとに統合テスト→プロダクションコード→テスト実行の順で進める。

## データベース設計

### Submissionテーブル
`docs/db/04_submission.md`で設計済み。以下の主要フィールドを含む：

```typescript
export const submissions = pgTable('Submission', {
  id: serial('id').primaryKey(),
  
  // 基本情報
  bookId: integer('bookId').notNull().references(() => books.id),
  printingCompanyId: integer('printingCompanyId').notNull().references(() => printingCompanies.id),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  
  // 日付管理
  submissionDate: timestamp('submissionDate', { mode: 'date', precision: 3 }),
  expectedDeliveryDate: timestamp('expectedDeliveryDate', { mode: 'date', precision: 3 }),
  actualDeliveryDate: timestamp('actualDeliveryDate', { mode: 'date', precision: 3 }),
  
  // 印刷情報
  quantity: integer('quantity').notNull(),
  specificationNotes: text('specificationNotes'),
  
  // コスト情報
  printingCost: integer('printingCost'),
  shippingCost: integer('shippingCost'),
  otherCost: integer('otherCost'),
  totalCost: integer('totalCost'),
  discountType: varchar('discountType', { length: 50 }),
  
  // 配送情報
  deliveryDestination: varchar('deliveryDestination', { length: 255 }),
  deliveryNotes: text('deliveryNotes'),
  
  // その他
  submissionFileNotes: text('submissionFileNotes'),
  generalNotes: text('generalNotes'),
  
  // タイムスタンプ
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull().defaultNow().$onUpdate(() => new Date()),
})
```

### ステータス定義
- `draft`: 入稿準備中（デフォルト）
- `submitted`: 入稿済み
- `printing`: 印刷中
- `delivered`: 納品済み
- `cancelled`: キャンセル

## Phase 1: 基本機能（必須）

### ✅ 1. 入稿一覧画面（GET /submissions）**【完了】**

#### 設計フェーズ
- [x] 画面仕様の確認（全入稿の一覧表示）
- [x] 必要なデータとビューの設計
- [x] 書籍・印刷所との結合表示設計

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/submissions/list-submissions.integration.spec.ts）
- [x] 2-2. プロダクションコード実装
  - [x] スキーマ追加（src/db/schema.ts にSubmissionテーブル）
  - [x] マイグレーション生成・実行（本番・テスト両方）
  - [x] モジュール作成（src/submissions/submissions.module.ts）
  - [x] コントローラー作成（submissions.controller.ts）
  - [x] サービス作成（submissions.service.ts）
  - [x] ビューファイル作成（src/views/submissions/index.ejs）
  - [x] ルーティング設定（app.moduleに追加）
- [x] 2-3. 型チェック（pnpm type-check）
- [x] 2-4. Linter実行（pnpm format）
- [x] 2-5. テスト実行（pnpm test:integration）**【統合テスト5件全通過】**
- [x] 2-6. ユーザー確認（動作確認完了）

#### 実装済みファイル（新規作成）
```
✅ src/db/schema.ts（Submissionテーブル追加）
✅ src/submissions/submissions.module.ts
✅ src/submissions/submissions.controller.ts（入稿一覧機能）
✅ src/submissions/submissions.service.ts（JOIN処理でデータ取得）
✅ src/views/submissions/index.ejs（入稿一覧画面）
✅ test/integration/submissions/list-submissions.integration.spec.ts（統合テスト5件）
✅ drizzle/0005_magical_scarecrow.sql（マイグレーションファイル）
```

#### 技術的な実装内容
- Drizzle ORMでのINNER JOIN処理（書籍・印刷所との結合）
- ステータス日本語変換機能（draft→準備中、submitted→入稿済み等）
- レスポンシブ対応のEJSビューファイル
- 書籍名・印刷所名・ステータス・部数・搬入先・作成日の表示

### ✅ 2. 書籍の入稿履歴（GET /books/:bookId/submissions）**【完了】**

#### 設計フェーズ
- [x] 書籍ごとの入稿履歴表示仕様確認
- [x] ページネーション・ソート設計

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/submissions/book-submissions.integration.spec.ts）
- [x] 2-2. プロダクションコード実装
  - [x] BooksControllerにfindSubmissionsByBook()追加
  - [x] SubmissionsServiceにfindByBook()追加
  - [x] ビューファイル作成（src/views/submissions/book-index.ejs）
- [x] 2-3. 型チェック（pnpm type-check）
- [x] 2-4. Linter実行（pnpm format）
- [x] 2-5. テスト実行（pnpm test:integration）**【統合テスト175件全通過】**
- [x] 2-6. ユーザー確認（ビューファイル配置問題解決済み）

### ✅ 3. 新規入稿作成（GET /books/:bookId/submissions/new + POST /books/:bookId/submissions）**【完了】**

#### 設計フェーズ
- [x] 入稿作成フォーム仕様の確認
- [x] バリデーションルールの設計
- [x] 印刷所選択UI設計

#### 実装フェーズ
- [x] 2-1. 統合テスト作成（test/integration/submissions/create-submission.integration.spec.ts）
- [x] 2-2. プロダクションコード実装
  - [x] CreateSubmissionDto作成
  - [x] BooksControllerにrenderNewSubmissionForm()とcreateSubmission()追加
  - [x] サービスにcreate()追加
  - [x] ビューファイル作成（src/views/submissions/new.ejs）
- [x] 2-3. 型チェック（pnpm type-check）
- [x] 2-4. Linter実行（pnpm format）
- [x] 2-5. テスト実行（pnpm test:integration）
- [x] 2-6. ビルド実行（pnpm build）とビューファイルコピー確認
- [x] 2-7. ユーザー確認待ち

### 4. 入稿詳細画面（GET /submissions/:id）

#### 設計フェーズ
- [ ] 詳細画面の表示項目確認
- [ ] 関連データ（書籍・印刷所）の表示設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/show-submission.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] コントローラーにfindOne()追加
  - [ ] サービスにfindOne()追加（JOIN処理含む）
  - [ ] ビューファイル作成（src/views/submissions/show.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

## Phase 2: 編集・削除機能

### 5. 入稿編集（GET /submissions/:id/edit + PUT /submissions/:id）

#### 設計フェーズ
- [ ] 編集フォーム仕様の確認
- [ ] ステータス更新ルールの設計
- [ ] バリデーションルールの確認

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/update-submission.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] UpdateSubmissionDto作成
  - [ ] コントローラーにrenderEditForm()とupdate()追加
  - [ ] サービスにupdate()追加
  - [ ] ビューファイル作成（src/views/submissions/edit.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

### 6. 入稿削除（DELETE /submissions/:id）

#### 設計フェーズ
- [ ] 削除確認の仕様確認（JavaScript confirm()ダイアログ使用）
- [ ] 関連データとの整合性確認

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/delete-submission.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] コントローラーにremove()追加（DELETEデコレータ、HTTPメソッドオーバーライド対応）
  - [ ] サービスにremove()追加（存在確認付き削除処理）
  - [ ] 削除確認UI追加（詳細画面に削除ボタンとJavaScript確認ダイアログ）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

## Phase 3: 集計機能（将来実装）

### 7. 進行中入稿一覧（GET /submissions/in-progress）

#### 設計フェーズ
- [ ] 進行中ステータスの定義確認
- [ ] 表示項目・ソート順の設計

#### 実装フェーズ
- [ ] 統合テスト・プロダクションコード実装
- [ ] ビューファイル作成

### 8. コスト一覧・集計（GET /submissions/costs）

#### 設計フェーズ
- [ ] コスト集計機能の仕様確認
- [ ] 印刷所別・期間別集計の設計

#### 実装フェーズ
- [ ] 統合テスト・プロダクションコード実装
- [ ] 集計処理・ビューファイル作成

## 必要なファイル構成

```
src/
├── submissions/
│   ├── submissions.module.ts
│   ├── submissions.controller.ts
│   ├── submissions.service.ts
│   ├── dto/
│   │   ├── create-submission.dto.ts
│   │   └── update-submission.dto.ts
│   └── entities/
│       └── submission.entity.ts
└── db/
    └── schema.ts（Submissionテーブル追加）

src/views/
└── submissions/
    ├── index.ejs（全入稿一覧）
    ├── book-index.ejs（書籍別入稿履歴）
    ├── new.ejs（新規作成）
    ├── show.ejs（詳細）
    └── edit.ejs（編集）

test/
└── integration/
    └── submissions/
        ├── list-submissions.integration.spec.ts
        ├── book-submissions.integration.spec.ts
        ├── create-submission.integration.spec.ts
        ├── show-submission.integration.spec.ts
        ├── update-submission.integration.spec.ts
        └── delete-submission.integration.spec.ts
```

## 実装時の注意事項

- コントローラーメソッド名はNestJS規則に従う（findAll、findOne、create、update、remove）
- フォーム表示用メソッドはrenderNewForm、renderEditFormを使用
- HTTPメソッドオーバーライドで_method=PUT/DELETEを使用
- EJSテンプレートでMPA構成
- 各段階でテストが通ることを確認してから次に進む
- 印刷所・書籍との結合処理では適切なJOINを使用
- 日付フィールドは適切な入力バリデーション・表示フォーマットを実装
- 金額フィールドは整数型（円単位）で管理
- **重要**: 新しいビューファイル作成時は必ず `pnpm build` を実行して `dist/views/` にコピーすること
- **重要**: テストデータ作成時は必ずスキーマ定義（`src/db/schema.ts`）を確認
- **重要**: 新規パッケージ使用時は事前に`package.json`を確認
- **重要**: URLパスに基づいて適切なコントローラーに実装（例: `/books/:id/...` → BooksController）

## 現在の状況

- [x] Phase 1-1: 入稿一覧画面 **【完了 - 統合テスト5件全通過】**
- [x] Phase 1-2: 書籍の入稿履歴 **【完了 - 統合テスト175件全通過】**
- [x] Phase 1-3: 新規入稿作成 **【完了 - 実装済み、動作確認待ち】**
- [ ] Phase 1-4: 入稿詳細画面 **【未着手】**
- [ ] Phase 2-1: 入稿編集 **【未着手】**
- [ ] Phase 2-2: 入稿削除 **【未着手】**

## 完了報告

### Phase 1-1: 入稿一覧画面 実装完了 ✅

**実装日時**: 2025/06/18 23:03完了  
**テスト結果**: 統合テスト170件全て通過（入稿一覧テスト5件含む）  
**動作確認**: ユーザーによる動作確認完了

**主な成果物**:
- Submissionテーブル実装（20フィールド、書籍・印刷所との外部キー参照）
- 入稿一覧表示機能（/submissions）- JOIN処理で関連データ取得
- ステータス日本語変換機能
- レスポンシブ対応のEJSビューファイル
- 完全な統合テスト（5パターンのテストケース）

**技術的な実装内容**:
- Drizzle ORMでのINNER JOIN処理（submissions ⟨-⟩ books ⟨-⟩ printingCompanies）
- NestJS規則に従ったコントローラー・サービス構成
- HTTPメソッドオーバーライド対応のインフラ構築
- 印刷所機能の成功パターンを踏襲した実装手順

**次のステップ**: Phase 1-2（書籍の入稿履歴）の実装

### Phase 1-2: 書籍の入稿履歴画面 実装完了 ✅

**実装日時**: 2025/06/18 23:17完了  
**テスト結果**: 統合テスト175件全て通過（書籍別入稿履歴テスト5件含む）  
**動作確認**: ユーザーによる動作確認完了（ビューファイル配置問題も解決）

**主な成果物**:
- 書籍別入稿履歴表示機能（/books/:bookId/submissions）
- 書籍存在確認・404エラーハンドリング
- 空状態の適切な処理
- 作成日降順ソート機能
- BooksControllerとSubmissionsServiceの連携

**技術的な実装内容**:
- BooksControllerに `findSubmissionsByBook()` メソッド追加
- SubmissionsService に `findByBook()` メソッド追加
- JOIN処理での書籍存在確認+入稿履歴取得
- レスポンシブ対応のEJSビューファイル（book-index.ejs）
- 統合テスト5種類の完全カバレッジ

**解決した課題**:
- ビューファイル配置問題（pnpm build でdist/にコピー必要）
- 再発防止策として開発ルールにビルド手順を追加

**実装済みファイル（新規作成・修正）**:
```
✅ src/books/books.controller.ts（findSubmissionsByBook()メソッド追加）
✅ src/books/books.module.ts（SubmissionsService依存性注入）
✅ src/submissions/submissions.service.ts（findByBook()メソッド追加）
✅ src/views/submissions/book-index.ejs（書籍別入稿履歴画面）
✅ test/integration/submissions/book-submissions.integration.spec.ts（統合テスト5件）
```

**次のステップ**: Phase 1-3（新規入稿作成）の実装

### Phase 1-3: 新規入稿作成機能 実装完了 ✅

**実装日時**: 2025/06/19 20:25完了  
**実装状況**: コード実装完了、ビルド確認済み、動作確認待ち

**主な成果物**:
- 新規入稿作成フォーム（/books/:bookId/submissions/new）
- 入稿作成処理（POST /books/:bookId/submissions）
- 包括的なバリデーション機能（必須項目、データ型、存在チェック）
- レスポンシブ対応の作成フォーム
- 統合テスト6パターンの実装

**技術的な実装内容**:
- BooksControllerに `renderNewSubmissionForm()` と `createSubmission()` メソッド追加
- SubmissionsService に `create()` メソッド追加（印刷所存在確認、合計コスト計算）
- CreateSubmissionDto によるリクエストバリデーション（class-validator使用）
- レスポンシブ対応のEJSビューファイル（new.ejs）
- 包括的なエラーハンドリング（存在しない書籍・印刷所、バリデーションエラー）

**解決した課題**:
- **依存関係の不足**: `@nestjs/mapped-types`、`method-override`を追加インストール
- **型エラーの修正**: スキーマ定義を確認してテストデータのフィールド名を修正
- **インポートパスの問題**: 他のテストファイルを参考に正しいパスに修正
- **コントローラー配置**: URLパスから適切なコントローラー（BooksController）に実装

**実装済みファイル（新規作成・修正）**:
```
✅ src/submissions/dto/create-submission.dto.ts（バリデーション付きDTO）
✅ src/books/books.controller.ts（新規入稿作成メソッド追加）
✅ src/books/books.module.ts（PrintingCompaniesService依存性注入）
✅ src/submissions/submissions.service.ts（create()メソッド追加）
✅ src/views/submissions/new.ejs（新規入稿作成フォーム）
✅ test/integration/submissions/create-submission.integration.spec.ts（統合テスト6件）
```

**学んだ教訓・改善点**:
- 実装前チェックリストの重要性（スキーマ定義、依存関係、URLパス）
- 統合テスト駆動開発の効果（仕様の明確化、早期エラー発見）
- 既存パターン踏襲の価値（印刷所機能の実装パターンを参考）

**次のステップ**: ユーザーによる動作確認 → Phase 1-4（入稿詳細画面）の実装

## URL設計（docs/01_url.mdより）

### 入稿（Submissions）- 基本機能
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/submissions` | 全入稿一覧ページ |
| GET | `/submissions/in-progress` | 進行中の入稿一覧 |
| GET | `/submissions/costs` | コスト一覧・簡易集計 |
| GET | `/books/:bookId/submissions` | 書籍の入稿履歴一覧 |
| GET | `/books/:bookId/submissions/new` | 新規入稿作成フォーム |
| POST | `/books/:bookId/submissions` | 入稿作成処理 |
| GET | `/submissions/:id` | 入稿詳細ページ |
| GET | `/submissions/:id/edit` | 入稿編集フォーム |
| PUT | `/submissions/:id` | 入稿更新処理（_method=PUT） |
| DELETE | `/submissions/:id` | 入稿削除処理（_method=DELETE） |

### 入稿（Submissions）- 段階的更新
| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/submissions/:id/status/edit` | ステータス更新フォーム |
| PUT | `/submissions/:id/status` | ステータス更新処理（_method=PUT） |
| GET | `/submissions/:id/costs/edit` | コスト情報更新フォーム |
| PUT | `/submissions/:id/costs` | コスト情報更新処理（_method=PUT） |