# 入稿（Submissions）テーブル設計

## テーブル定義

```typescript
export const submissions = pgTable('Submission', {
  id: serial('id').primaryKey(),
  
  // 基本情報
  bookId: integer('bookId')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  printingCompanyId: integer('printingCompanyId')
    .notNull()
    .references(() => printingCompanies.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 })
    .notNull()
    .default('draft'),
  
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
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert
```

## 設計方針

### 現在の実装
- **1テーブル設計**: 入稿に関する全情報を単一テーブルで管理
- **書籍との関連**: bookIdで書籍テーブルと外部キー参照（カスケード削除）
- **印刷所との関連**: printingCompanyIdで印刷所テーブルと外部キー参照（削除制限）
- **ステータス管理**: 入稿の進行状況を追跡
- **柔軟な仕様管理**: 印刷仕様は自由記述のメモ欄で対応
- **金額管理**: 整数型で円単位の金額を管理

### 設計理念
- 同人誌制作の実態に即したシンプルな構造
- 頻繁に変更されない入稿データの特性を考慮
- JOINなしで入稿情報を一括取得可能
- 個人・小規模サークルでの使いやすさを重視

### リレーション
- **books テーブルとの関係**: N:1（多対一）
  - 1つの書籍に対して複数の入稿が可能（増刷など）
  - 書籍削除時に関連する入稿も自動削除（CASCADE）
- **printingCompanies テーブルとの関係**: N:1（多対一）
  - 1つの印刷所に対して複数の入稿履歴
  - 印刷所削除時は入稿データを保護（RESTRICT）

## フィールド詳細

### 基本情報
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| id | serial | PRIMARY KEY | 入稿の一意識別子 |
| bookId | integer | NOT NULL, FOREIGN KEY | 関連する書籍のID |
| printingCompanyId | integer | NOT NULL, FOREIGN KEY | 利用する印刷所のID |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | ステータス（draft/submitted/printing/delivered/cancelled） |

### 日付管理
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| submissionDate | timestamp | NULL | 実際に入稿した日時 |
| expectedDeliveryDate | timestamp | NULL | 納品予定日時 |
| actualDeliveryDate | timestamp | NULL | 実際の納品日時 |

### 印刷情報
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| quantity | integer | NOT NULL | 印刷部数 |
| specificationNotes | text | NULL | 印刷仕様メモ（判型、ページ数、綴じ方、紙質など） |

### コスト情報
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| printingCost | integer | NULL | 印刷費（円） |
| shippingCost | integer | NULL | 送料（円） |
| otherCost | integer | NULL | その他費用（円） |
| totalCost | integer | NULL | 合計金額（円） |
| discountType | varchar(50) | NULL | 割引種別（早割、イベント割など） |

### 配送情報
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| deliveryDestination | varchar(255) | NULL | 搬入先（イベント会場、自宅など） |
| deliveryNotes | text | NULL | 配送に関するメモ |

### その他
| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| submissionFileNotes | text | NULL | 入稿ファイルに関するメモ |
| generalNotes | text | NULL | その他一般的なメモ |
| createdAt | timestamp | NOT NULL, DEFAULT NOW | 作成日時 |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW | 更新日時（自動更新） |

## ステータス定義

| ステータス | 説明 |
|-----------|------|
| draft | 入稿準備中（デフォルト） |
| submitted | 入稿済み |
| printing | 印刷中 |
| delivered | 納品済み |
| cancelled | キャンセル |

## 使用例

### 入稿の作成
```typescript
const submission = await drizzle.db.insert(submissions).values({
  bookId: 1,
  printingCompanyId: 1,
  quantity: 500,
  specificationNotes: "B5サイズ、100ページ、無線綴じ、表紙PP加工あり",
  expectedDeliveryDate: new Date("2024-12-20"),
  deliveryDestination: "コミックマーケット103 東A-123a",
  discountType: "早割20%",
  submissionFileNotes: "final_v3.pdf を入稿"
}).returning();
```

### 書籍の入稿履歴取得
```typescript
const bookSubmissions = await drizzle.db
  .select()
  .from(submissions)
  .where(eq(submissions.bookId, 1))
  .orderBy(desc(submissions.submissionDate));
```

### ステータス更新
```typescript
const updated = await drizzle.db
  .update(submissions)
  .set({
    status: 'submitted',
    submissionDate: new Date(),
    printingCost: 50000,
    shippingCost: 3000,
    totalCost: 53000
  })
  .where(eq(submissions.id, 1))
  .returning();
```

### 印刷所の利用履歴取得
```typescript
const companySubmissions = await drizzle.db
  .select({
    submission: submissions,
    book: books
  })
  .from(submissions)
  .innerJoin(books, eq(submissions.bookId, books.id))
  .where(eq(submissions.printingCompanyId, 1))
  .orderBy(desc(submissions.submissionDate));
```

## バリデーション

### CreateSubmissionDto
```typescript
export class CreateSubmissionDto {
  @IsNotEmpty({ message: '印刷所は必須です' })
  @IsInt({ message: '印刷所IDは整数である必要があります' })
  printingCompanyId: number

  @IsNotEmpty({ message: '印刷部数は必須です' })
  @IsInt({ message: '印刷部数は整数である必要があります' })
  @Min(1, { message: '印刷部数は1部以上である必要があります' })
  quantity: number

  @IsOptional()
  @IsDateString({}, { message: '納品予定日は有効な日付である必要があります' })
  expectedDeliveryDate?: string

  @IsOptional()
  @IsString({ message: '印刷仕様は文字列である必要があります' })
  specificationNotes?: string

  @IsOptional()
  @IsString({ message: '搬入先は文字列である必要があります' })
  @MaxLength(255, { message: '搬入先は255文字以下である必要があります' })
  deliveryDestination?: string

  @IsOptional()
  @IsString({ message: '割引種別は文字列である必要があります' })
  @MaxLength(50, { message: '割引種別は50文字以下である必要があります' })
  discountType?: string

  // その他のフィールド...
}
```

### UpdateSubmissionDto
```typescript
export class UpdateSubmissionDto {
  @IsOptional()
  @IsIn(['draft', 'submitted', 'printing', 'delivered', 'cancelled'])
  status?: string

  @IsOptional()
  @IsDateString({}, { message: '入稿日は有効な日付である必要があります' })
  submissionDate?: string

  @IsOptional()
  @IsInt({ message: '印刷費は整数である必要があります' })
  @Min(0, { message: '印刷費は0以上である必要があります' })
  printingCost?: number

  @IsOptional()
  @IsInt({ message: '送料は整数である必要があります' })
  @Min(0, { message: '送料は0以上である必要があります' })
  shippingCost?: number

  // その他のフィールド...
}
```

## 実装予定機能

### API エンドポイント
- `GET /books/:bookId/submissions` - 書籍の入稿履歴一覧
- `GET /books/:bookId/submissions/new` - 入稿追加フォーム表示
- `POST /books/:bookId/submissions` - 入稿作成処理
- `GET /submissions/:id` - 入稿詳細表示
- `GET /submissions/:id/edit` - 入稿編集フォーム表示
- `PUT /submissions/:id` - 入稿更新処理
- `DELETE /submissions/:id` - 入稿削除処理

### 集計・分析機能
- **コスト分析**: 印刷所別、書籍別のコスト集計
- **納期実績**: 印刷所別の納期遵守率
- **利用頻度**: 印刷所の利用回数、最終利用日の表示

### 将来の拡張予定
1. **イベントテーブルとの連携**: 搬入先の正規化
2. **入稿チェックリスト**: 事前確認項目の管理
3. **ファイルアップロード**: 入稿データの保存
4. **通知機能**: 納品予定日のリマインダー