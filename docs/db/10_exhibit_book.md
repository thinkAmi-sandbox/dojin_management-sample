# 出展書籍（ExhibitBooks）テーブル設計

## テーブル定義

```sql
CREATE TABLE exhibit_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exhibit_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  planned_quantity INTEGER NOT NULL DEFAULT 0,
  selling_price INTEGER,
  display_order INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (exhibit_id) REFERENCES exhibits(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE(exhibit_id, book_id)
);
```

## Drizzle ORM定義

```typescript
export const exhibitBooks = pgTable('exhibit_books', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  exhibitId: integer('exhibit_id').notNull().references(() => exhibits.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  plannedQuantity: integer('planned_quantity').notNull().default(0),
  sellingPrice: integer('selling_price'),
  displayOrder: integer('display_order').default(1),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueExhibitBook: unique().on(table.exhibitId, table.bookId),
}));
```

## 設計方針

### 基本機能
- **多対多関係管理**: 出展申込と書籍の関連付け
- **頒布情報管理**: 頒布予定数、価格、表示順序の管理
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **外部キー関係**: exhibitsテーブルとbooksテーブルとの関連
- **一意性制約**: 同一出展での書籍重複登録防止

### 項目詳細
- **exhibit_id**: 出展申込ID（外部キー）
- **book_id**: 書籍ID（外部キー）
- **planned_quantity**: 頒布予定数（持ち込み予定部数）
- **selling_price**: 頒布価格（円）
- **display_order**: 表示順序（ブース内での並び順）
- **notes**: 頒布に関する備考（限定版、セット販売等）

### 制約事項
- **一意性制約**: 1つの出展申込に同じ書籍は1回のみ登録可能
- **外部キー制約**: カスケード削除でデータ整合性を保持
- **必須項目**: 出展申込、書籍、頒布予定数は必須

### 将来の拡張予定
1. **在庫管理**: 実際の持ち込み数、売れ残り数の記録
2. **売上記録**: 実際の売上数、売上金額の管理
3. **価格バリエーション**: 早期割引、セット価格等の管理
4. **頒布制限**: 1人あたりの購入制限数
5. **デジタル版情報**: 電子版の有無、DL販売情報

## 関連テーブル

### 親テーブル
- **exhibits**: 出展申込情報
- **books**: 書籍の基本情報

### 関連情報の取得例
```typescript
// 出展で頒布予定の書籍一覧を取得
const exhibitWithBooks = await drizzleService.db.select({
  exhibitId: exhibits.id,
  eventName: events.name,
  circleName: circles.name,
  bookTitle: books.title,
  bookSubtitle: books.subtitle,
  plannedQuantity: exhibitBooks.plannedQuantity,
  sellingPrice: exhibitBooks.sellingPrice,
  displayOrder: exhibitBooks.displayOrder,
})
.from(exhibitBooks)
.innerJoin(exhibits, eq(exhibitBooks.exhibitId, exhibits.id))
.innerJoin(events, eq(exhibits.eventId, events.id))
.innerJoin(circles, eq(exhibits.circleId, circles.id))
.innerJoin(books, eq(exhibitBooks.bookId, books.id))
.where(eq(exhibits.id, 1))
.orderBy(exhibitBooks.displayOrder);
```

## 使用例

### 出展書籍の登録
```typescript
const exhibitBook = await drizzleService.db.insert(exhibitBooks).values({
  exhibitId: 1, // 技術書典17の出展申込
  bookId: 3,    // 「はじめてのNestJS」
  plannedQuantity: 50,
  sellingPrice: 1500,
  displayOrder: 1,
  notes: '技術書典初版。サイン本あり。',
});
```

### 複数書籍の一括登録
```typescript
const multipleBooks = await drizzleService.db.insert(exhibitBooks).values([
  {
    exhibitId: 1,
    bookId: 3,
    plannedQuantity: 50,
    sellingPrice: 1500,
    displayOrder: 1,
  },
  {
    exhibitId: 1,
    bookId: 7,
    plannedQuantity: 30,
    sellingPrice: 2000,
    displayOrder: 2,
  },
]);
```

### 出展書籍情報の検索
```typescript
// 特定出展の書籍一覧（表示順）
const exhibitBookList = await drizzleService.db.select({
  id: exhibitBooks.id,
  bookTitle: books.title,
  bookSubtitle: books.subtitle,
  plannedQuantity: exhibitBooks.plannedQuantity,
  sellingPrice: exhibitBooks.sellingPrice,
  notes: exhibitBooks.notes,
})
.from(exhibitBooks)
.innerJoin(books, eq(exhibitBooks.bookId, books.id))
.where(eq(exhibitBooks.exhibitId, 1))
.orderBy(exhibitBooks.displayOrder);

// 書籍別の出展予定一覧
const bookExhibitHistory = await drizzleService.db.select({
  exhibitId: exhibits.id,
  eventName: events.name,
  eventDate: events.eventDate,
  circleName: circles.name,
  plannedQuantity: exhibitBooks.plannedQuantity,
  sellingPrice: exhibitBooks.sellingPrice,
})
.from(exhibitBooks)
.innerJoin(exhibits, eq(exhibitBooks.exhibitId, exhibits.id))
.innerJoin(events, eq(exhibits.eventId, events.id))
.innerJoin(circles, eq(exhibits.circleId, circles.id))
.where(eq(exhibitBooks.bookId, 3))
.orderBy(desc(events.eventDate));
```

### 頒布情報の更新
```typescript
// 価格変更
const updatePrice = await drizzleService.db.update(exhibitBooks)
  .set({
    sellingPrice: 1800,
    notes: '価格改定により1800円に変更',
    updatedAt: new Date(),
  })
  .where(eq(exhibitBooks.id, 1));

// 頒布予定数変更
const updateQuantity = await drizzleService.db.update(exhibitBooks)
  .set({
    plannedQuantity: 80,
    updatedAt: new Date(),
  })
  .where(eq(exhibitBooks.id, 1));

// 表示順序の変更
const reorderBooks = await drizzleService.db.update(exhibitBooks)
  .set({
    displayOrder: 3,
    updatedAt: new Date(),
  })
  .where(and(
    eq(exhibitBooks.exhibitId, 1),
    eq(exhibitBooks.bookId, 3)
  ));
```

### 集計クエリ
```typescript
// 出展別の頒布予定数・売上予想
const exhibitSummary = await drizzleService.db.select({
  exhibitId: exhibitBooks.exhibitId,
  eventName: events.name,
  circleName: circles.name,
  totalBooks: count(exhibitBooks.id),
  totalQuantity: sum(exhibitBooks.plannedQuantity),
  estimatedRevenue: sum(
    sql`${exhibitBooks.plannedQuantity} * ${exhibitBooks.sellingPrice}`
  ),
})
.from(exhibitBooks)
.innerJoin(exhibits, eq(exhibitBooks.exhibitId, exhibits.id))
.innerJoin(events, eq(exhibits.eventId, events.id))
.innerJoin(circles, eq(exhibits.circleId, circles.id))
.groupBy(
  exhibitBooks.exhibitId, 
  events.name, 
  circles.name
)
.orderBy(events.eventDate);

// 書籍別の頒布実績
const bookPopularity = await drizzleService.db.select({
  bookId: exhibitBooks.bookId,
  bookTitle: books.title,
  totalExhibits: count(exhibitBooks.exhibitId),
  totalPlannedQuantity: sum(exhibitBooks.plannedQuantity),
  averagePrice: avg(exhibitBooks.sellingPrice),
})
.from(exhibitBooks)
.innerJoin(books, eq(exhibitBooks.bookId, books.id))
.groupBy(exhibitBooks.bookId, books.title)
.orderBy(desc(sum(exhibitBooks.plannedQuantity)));
```

## バリデーション要件

### 必須項目チェック
- 出展申込ID: 有効なexhibits.idへの参照
- 書籍ID: 有効なbooks.idへの参照
- 頒布予定数: 0以上の整数

### ビジネスルールチェック
- 重複登録防止: 同一(exhibit_id, book_id)の組み合わせは1件のみ
- 価格妥当性: 頒布価格は0円以上（無料頒布も可）
- 数量妥当性: 頒布予定数は物理的に持ち込み可能な範囲

### データ整合性
- 外部キー制約により、存在しないexhibit_idやbook_idは挿入不可
- カスケード削除により、親レコード削除時に関連する頒布情報も削除
- 表示順序の重複は許可（同順位での表示も可能）