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

### 1. 入稿一覧画面（GET /submissions）

#### 設計フェーズ
- [ ] 画面仕様の確認（全入稿の一覧表示）
- [ ] 必要なデータとビューの設計
- [ ] 書籍・印刷所との結合表示設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/list-submissions.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] スキーマ追加（src/db/schema.ts にSubmissionテーブル）
  - [ ] マイグレーション生成・実行（本番・テスト両方）
  - [ ] モジュール作成（src/submissions/submissions.module.ts）
  - [ ] コントローラー作成（submissions.controller.ts）
  - [ ] サービス作成（submissions.service.ts）
  - [ ] ビューファイル作成（src/views/submissions/index.ejs）
  - [ ] ルーティング設定（app.moduleに追加）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

### 2. 書籍の入稿履歴（GET /books/:bookId/submissions）

#### 設計フェーズ
- [ ] 書籍ごとの入稿履歴表示仕様確認
- [ ] ページネーション・ソート設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/book-submissions.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] コントローラーにfindByBook()追加
  - [ ] サービスにfindByBook()追加
  - [ ] ビューファイル作成（src/views/submissions/book-index.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

### 3. 新規入稿作成（GET /books/:bookId/submissions/new + POST /books/:bookId/submissions）

#### 設計フェーズ
- [ ] 入稿作成フォーム仕様の確認
- [ ] バリデーションルールの設計
- [ ] 印刷所選択UI設計

#### 実装フェーズ
- [ ] 2-1. 統合テスト作成（test/integration/submissions/create-submission.integration.spec.ts）
- [ ] 2-2. プロダクションコード実装
  - [ ] CreateSubmissionDto作成
  - [ ] コントローラーにrenderNewForm()とcreate()追加
  - [ ] サービスにcreate()追加
  - [ ] ビューファイル作成（src/views/submissions/new.ejs）
- [ ] 2-3. 型チェック（pnpm type-check）
- [ ] 2-4. Linter実行（pnpm format）
- [ ] 2-5. テスト実行（pnpm test:integration）
- [ ] 2-6. ユーザー確認

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

## 現在の状況

- [ ] Phase 1-1: 入稿一覧画面 **【未着手】**
- [ ] Phase 1-2: 書籍の入稿履歴 **【未着手】**
- [ ] Phase 1-3: 新規入稿作成 **【未着手】**
- [ ] Phase 1-4: 入稿詳細画面 **【未着手】**
- [ ] Phase 2-1: 入稿編集 **【未着手】**
- [ ] Phase 2-2: 入稿削除 **【未着手】**

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