# 書籍-執筆者関連（BookAuthors）テーブル設計

## テーブル定義

```typescript
export const bookAuthors = pgTable(
  'BookAuthor',
  {
    bookId: integer('bookId')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    authorId: integer('authorId')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.bookId, table.authorId] }),
  }),
)

export type BookAuthor = typeof bookAuthors.$inferSelect
export type NewBookAuthor = typeof bookAuthors.$inferInsert
```

## 設計方針

### 現在の実装
- **多対多リレーションの実現**: 書籍と執筆者の多対多関係を管理
- **複合プライマリキー**: bookIdとauthorIdの組み合わせで一意性を保証
- **カスケード削除**: 書籍または執筆者が削除された際に関連も自動削除
- **重複防止**: 同じ書籍に同じ執筆者を重複登録不可

### 設計理念
- 中間テーブルとしてシンプルな構造を維持
- 参照整合性を自動的に保証
- 書籍と執筆者の柔軟な関連付けを実現

### リレーション
- **books テーブルとの関係**: N:1（多対一）
  - bookIdで書籍テーブルを参照
  - 書籍削除時に関連レコードも自動削除（CASCADE）
- **authors テーブルとの関係**: N:1（多対一）
  - authorIdで執筆者テーブルを参照
  - 執筆者削除時に関連レコードも自動削除（CASCADE）

## フィールド詳細

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| bookId | integer | NOT NULL, FOREIGN KEY, PRIMARY KEY | 書籍のID |
| authorId | integer | NOT NULL, FOREIGN KEY, PRIMARY KEY | 執筆者のID |

## 制約詳細

### 複合プライマリキー
- bookIdとauthorIdの組み合わせがプライマリキー
- 同一の組み合わせは登録不可（重複防止）

### 外部キー制約
- bookId → books.id（CASCADE DELETE）
- authorId → authors.id（CASCADE DELETE）

## 使用例

### 書籍に執筆者を追加
```typescript
const bookAuthor = await drizzle.db.insert(bookAuthors).values({
  bookId: 1,
  authorId: 2
}).returning();
```

### 書籍の全執筆者を取得
```typescript
const bookAuthorList = await drizzle.db
  .select({
    author: authors,
    bookAuthor: bookAuthors
  })
  .from(bookAuthors)
  .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
  .where(eq(bookAuthors.bookId, 1));
```

### 執筆者の全書籍を取得
```typescript
const authorBookList = await drizzle.db
  .select({
    book: books,
    bookAuthor: bookAuthors
  })
  .from(bookAuthors)
  .innerJoin(books, eq(bookAuthors.bookId, books.id))
  .where(eq(bookAuthors.authorId, 1));
```

### 書籍から執筆者を削除
```typescript
await drizzle.db
  .delete(bookAuthors)
  .where(
    and(
      eq(bookAuthors.bookId, 1),
      eq(bookAuthors.authorId, 2)
    )
  );
```

### 複数の執筆者を一括追加
```typescript
const authors = [
  { bookId: 1, authorId: 2 },
  { bookId: 1, authorId: 3 },
  { bookId: 1, authorId: 4 }
];

await drizzle.db.insert(bookAuthors).values(authors);
```

## バリデーション

### AddAuthorToBookDto
```typescript
export class AddAuthorToBookDto {
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt({ message: '執筆者IDは整数である必要があります' })
  @IsPositive({ message: '執筆者IDは正の整数である必要があります' })
  authorId: number
}
```

## 実装済み機能

### API エンドポイント
- `POST /books/:bookId/authors` - 書籍に執筆者を追加
- `DELETE /books/:bookId/authors/:authorId` - 書籍から執筆者を削除
- `GET /books/:bookId/authors` - 書籍の執筆者一覧（書籍詳細に含む）
- `GET /authors/:authorId/books` - 執筆者の書籍一覧（執筆者詳細に含む）

### ビジネスロジック
- 重複登録の自動防止（複合プライマリキー）
- カスケード削除による整合性維持
- 書籍詳細画面での執筆者一覧表示
- 執筆者詳細画面での執筆書籍一覧表示

### 将来の拡張予定
1. **役割管理**: 原作者、イラストレーター、編集者などの役割区分
2. **順序管理**: 執筆者の表示順序
3. **貢献度**: 各執筆者の貢献割合
4. **期間管理**: 執筆に関わった期間の記録