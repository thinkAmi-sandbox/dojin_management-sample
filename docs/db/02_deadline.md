# 締切（Deadlines）テーブル設計

## テーブル定義

```typescript
export const deadlines = pgTable('Deadline', {
  id: serial('id').primaryKey(),
  bookId: integer('bookId')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  dueDate: timestamp('dueDate', { mode: 'date', precision: 3 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Deadline = typeof deadlines.$inferSelect
export type NewDeadline = typeof deadlines.$inferInsert
```

## 設計方針

### 現在の実装
- **書籍との関連**: bookIdで書籍テーブルと外部キー参照
- **カスケード削除**: 書籍が削除されると関連する締切も自動削除
- **必須項目**: タイトル、締切日、書籍ID
- **オプショナル項目**: 説明（description）
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### リレーション
- **books テーブルとの関係**: N:1（多対一）
  - 1つの書籍に対して複数の締切を設定可能
  - 書籍削除時に関連する締切も自動削除（CASCADE）

## フィールド詳細

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| id | serial | PRIMARY KEY | 締切の一意識別子 |
| bookId | integer | NOT NULL, FOREIGN KEY | 関連する書籍のID |
| title | varchar(255) | NOT NULL | 締切のタイトル（例：「原稿締切」「校正締切」） |
| dueDate | timestamp | NOT NULL | 締切日時 |
| description | text | NULL | 締切の詳細説明（任意） |
| createdAt | timestamp | NOT NULL, DEFAULT NOW | 作成日時 |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW | 更新日時（自動更新） |

## 使用例

### 締切の作成
```typescript
const deadline = await drizzle.db.insert(deadlines).values({
  bookId: 1,
  title: "原稿締切",
  dueDate: new Date("2024-12-31T23:59:59"),
  description: "初稿の提出締切です"
}).returning();
```

### 書籍に関連する締切の取得
```typescript
const bookDeadlines = await drizzle.db
  .select()
  .from(deadlines)
  .where(eq(deadlines.bookId, 1))
  .orderBy(deadlines.dueDate);
```

### 締切の更新
```typescript
const updatedDeadline = await drizzle.db
  .update(deadlines)
  .set({
    title: "最終締切",
    dueDate: new Date("2025-01-15T23:59:59"),
    description: "最終稿の提出締切です"
  })
  .where(eq(deadlines.id, 1))
  .returning();
```

### 締切の削除
```typescript
await drizzle.db
  .delete(deadlines)
  .where(eq(deadlines.id, 1));
```

## バリデーション

### CreateDeadlineDto
```typescript
export class CreateDeadlineDto {
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @IsNotEmpty({ message: '締切日は必須です' })
  @IsDateString({}, { message: '締切日は有効な日付である必要があります' })
  dueDate: string

  @IsOptional()
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string
}
```

## 実装済み機能

### API エンドポイント
- `GET /books/:bookId/deadlines` - 書籍の締切一覧取得
- `GET /books/:bookId/deadlines/new` - 締切追加フォーム表示
- `POST /books/:bookId/deadlines` - 締切作成処理

### 将来の拡張予定
1. **締切編集機能**: `GET /deadlines/:id/edit`, `PUT /deadlines/:id`
2. **締切削除機能**: `DELETE /deadlines/:id`
3. **通知機能**: 締切日が近づいた際の通知システム
4. **締切種別**: 原稿締切、校正締切などのカテゴリ分類
5. **完了状態**: 締切の達成状況管理