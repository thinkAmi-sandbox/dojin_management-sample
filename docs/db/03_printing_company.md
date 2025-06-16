# 印刷所（PrintingCompanies）テーブル設計

## 実装状況

**実装完了日**: 2025/06/16  
**実装状況**: ✅ 完了（Phase 1-1）  
**テスト状況**: 統合テスト4件実装済み・全通過  
**動作確認**: 開発・本番環境両方で動作確認済み

### 実装済み機能
- ✅ PrintingCompanyテーブル実装・マイグレーション完了
- ✅ 印刷所一覧表示（GET /printing-companies）
- ✅ 印刷所詳細表示（GET /printing-companies/:id）
- ✅ レスポンシブ対応のEJSビューファイル
- ✅ 統合テストスイート
- ✅ ビューファイル設定（開発・本番環境対応）

### 実装中/予定機能
- 🚧 新規印刷所登録（Phase 1-2）
- ⏳ 印刷所編集機能（Phase 2）
- ⏳ 印刷所削除機能（Phase 3）

## テーブル定義

```typescript
export const printingCompanies = pgTable('PrintingCompany', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  websiteUrl: varchar('websiteUrl', { length: 500 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type PrintingCompany = typeof printingCompanies.$inferSelect
export type NewPrintingCompany = typeof printingCompanies.$inferInsert
```

## 設計方針

### 現在の実装
- **最小限のマスタデータ**: 印刷所の基本情報のみを管理
- **実利用データの分離**: 実際の利用経験は入稿（Submission）テーブルで管理
- **メンテナンス性**: 頻繁に変更されない情報のみを保持
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### 設計理念
- 印刷所の公開情報（料金、仕様等）は管理しない
- 実際の利用経験（評価、品質等）は入稿テーブルに記録
- 印刷所マスタは識別と基本情報の管理に特化

### 将来のリレーション
- **submissions テーブルとの関係**: 1:N（一対多）
  - 1つの印刷所に対して複数の入稿履歴
  - 入稿時の詳細情報（印刷仕様、コスト、評価等）は入稿テーブルで管理

## フィールド詳細

| フィールド名 | 型 | 制約 | 説明 |
|------------|---|------|------|
| id | serial | PRIMARY KEY | 印刷所の一意識別子 |
| name | varchar(255) | NOT NULL | 印刷所名（例：「○○印刷」「△△プリント」） |
| websiteUrl | varchar(500) | NULL | 公式サイトのURL（任意） |
| notes | text | NULL | 自分用のメモ（対応の特徴、注意点等） |
| createdAt | timestamp | NOT NULL, DEFAULT NOW | 作成日時 |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW | 更新日時（自動更新） |

## 使用例

### 印刷所の作成
```typescript
const printingCompany = await drizzle.db.insert(printingCompanies).values({
  name: "サンライズパブリケーション",
  websiteUrl: "https://www.sunrise-pub.co.jp",
  notes: "同人誌印刷専門。対応が丁寧で初心者にも優しい。"
}).returning();
```

### 印刷所一覧の取得
```typescript
const companies = await drizzle.db
  .select()
  .from(printingCompanies)
  .orderBy(printingCompanies.name);
```

### 印刷所の更新
```typescript
const updatedCompany = await drizzle.db
  .update(printingCompanies)
  .set({
    websiteUrl: "https://www.new-sunrise-pub.co.jp",
    notes: "URLが変更になった。締切が厳しいが品質は高い。"
  })
  .where(eq(printingCompanies.id, 1))
  .returning();
```

### 印刷所の削除
```typescript
await drizzle.db
  .delete(printingCompanies)
  .where(eq(printingCompanies.id, 1));
```

## バリデーション

### CreatePrintingCompanyDto
```typescript
export class CreatePrintingCompanyDto {
  @IsNotEmpty({ message: '印刷所名は必須です' })
  @IsString({ message: '印刷所名は文字列である必要があります' })
  @MaxLength(255, { message: '印刷所名は255文字以下である必要があります' })
  name: string

  @IsOptional()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  @MaxLength(500, { message: 'URLは500文字以下である必要があります' })
  websiteUrl?: string

  @IsOptional()
  @IsString({ message: '備考は文字列である必要があります' })
  notes?: string
}
```

### UpdatePrintingCompanyDto
```typescript
export class UpdatePrintingCompanyDto {
  @IsOptional()
  @IsString({ message: '印刷所名は文字列である必要があります' })
  @MaxLength(255, { message: '印刷所名は255文字以下である必要があります' })
  name?: string

  @IsOptional()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  @MaxLength(500, { message: 'URLは500文字以下である必要があります' })
  websiteUrl?: string

  @IsOptional()
  @IsString({ message: '備考は文字列である必要があります' })
  notes?: string
}
```

## APIエンドポイント

### 実装済み
- ✅ `GET /printing-companies` - 印刷所一覧取得
- ✅ `GET /printing-companies/:id` - 印刷所詳細表示

### 実装予定
- 🚧 `GET /printing-companies/new` - 印刷所追加フォーム表示
- 🚧 `POST /printing-companies` - 印刷所作成処理  
- ⏳ `GET /printing-companies/:id/edit` - 印刷所編集フォーム表示
- ⏳ `PUT /printing-companies/:id` - 印刷所更新処理
- ⏳ `DELETE /printing-companies/:id` - 印刷所削除処理

### 関連機能
- **入稿履歴表示**: 印刷所ごとの入稿履歴一覧
- **評価集計**: 入稿データから印刷所の平均評価を算出
- **利用統計**: 利用回数、最終利用日等の自動集計