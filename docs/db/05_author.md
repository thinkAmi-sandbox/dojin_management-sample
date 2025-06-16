# 執筆者（Authors）テーブル設計

## テーブル定義

```typescript
export const authors = pgTable('Author', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  bio: text('bio'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Author = typeof authors.$inferSelect
export type NewAuthor = typeof authors.$inferInsert
```

## 設計方針

### 現在の実装
- **執筆者の基本情報管理**: 名前、メールアドレス、プロフィールを管理
- **メールアドレスのユニーク制約**: 同一メールアドレスの重複登録を防止
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### 設計理念
- 執筆者情報をシンプルに管理
- メールアドレスによる一意性を保証
- 書籍との多対多リレーションをBookAuthorテーブルで実現

### リレーション
- **books テーブルとの関係**: N:N（多対多）
  - BookAuthorテーブルを介して書籍と関連付け
  - 1人の執筆者が複数の書籍に関わることが可能
  - 1つの書籍に複数の執筆者が関わることが可能

## フィールド詳細

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| id | serial | PRIMARY KEY | 執筆者の一意識別子 |
| name | varchar(255) | NOT NULL | 執筆者名（ペンネーム可） |
| email | varchar(255) | UNIQUE | メールアドレス（任意、重複不可） |
| bio | text | NULL | プロフィール・自己紹介文 |
| createdAt | timestamp | NOT NULL, DEFAULT NOW | 作成日時 |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW | 更新日時（自動更新） |

## 使用例

### 執筆者の作成
```typescript
const author = await drizzle.db.insert(authors).values({
  name: "山田太郎",
  email: "yamada@example.com",
  bio: "ファンタジー小説を中心に執筆しています。代表作『異世界冒険記』"
}).returning();
```

### 執筆者一覧の取得
```typescript
const authorList = await drizzle.db
  .select()
  .from(authors)
  .orderBy(authors.name);
```

### 執筆者の更新
```typescript
const updatedAuthor = await drizzle.db
  .update(authors)
  .set({
    bio: "ファンタジー小説とSF小説を執筆。最新作『未来都市物語』好評発売中",
    email: "yamada.taro@newdomain.com"
  })
  .where(eq(authors.id, 1))
  .returning();
```

### 執筆者の削除
```typescript
await drizzle.db
  .delete(authors)
  .where(eq(authors.id, 1));
```

### 執筆者の書籍一覧取得
```typescript
const authorBooks = await drizzle.db
  .select({
    author: authors,
    book: books
  })
  .from(authors)
  .innerJoin(bookAuthors, eq(authors.id, bookAuthors.authorId))
  .innerJoin(books, eq(bookAuthors.bookId, books.id))
  .where(eq(authors.id, 1));
```

## バリデーション

### CreateAuthorDto
```typescript
export class CreateAuthorDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNotEmpty({ message: '名前は必須です' })
  @IsString({ message: '名前は文字列である必要があります' })
  name: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'プロフィールは文字列である必要があります' })
  bio?: string
}
```

### UpdateAuthorDto
```typescript
export class UpdateAuthorDto extends PartialType(CreateAuthorDto) {}
```

## 実装済み機能

### API エンドポイント
- `GET /authors` - 執筆者一覧取得
- `GET /authors/new` - 執筆者追加フォーム表示
- `POST /authors` - 執筆者作成処理
- `GET /authors/:id` - 執筆者詳細表示
- `GET /authors/:id/edit` - 執筆者編集フォーム表示
- `PUT /authors/:id` - 執筆者更新処理
- `DELETE /authors/:id` - 執筆者削除処理

### 書籍との関連操作
- `POST /books/:bookId/authors` - 書籍に執筆者を追加
- `DELETE /books/:bookId/authors/:authorId` - 書籍から執筆者を削除

### 将来の拡張予定
1. **SNS情報**: Twitter、pixivなどのアカウント情報
2. **活動ジャンル**: 得意分野のタグ管理
3. **連絡先管理**: 複数の連絡手段の管理
4. **執筆実績**: 過去の執筆履歴の詳細管理