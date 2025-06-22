# イベント（Events）テーブル設計

## テーブル定義

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  venue VARCHAR(255) NOT NULL,
  application_start_date DATE NOT NULL,
  application_end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Drizzle ORM定義

```typescript
export const events = pgTable('events', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  eventDate: date('event_date').notNull(),
  venue: varchar('venue', { length: 255 }).notNull(),
  applicationStartDate: date('application_start_date').notNull(),
  applicationEndDate: date('application_end_date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## 設計方針

### 基本機能
- **イベント情報管理**: 技術書典、コミケなどの同人誌即売会の基本情報
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **必須情報**: イベント名、開催日、会場、申込期間
- **任意情報**: イベントの詳細説明
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### 項目詳細
- **name**: イベント名（例：技術書典17、コミックマーケット103）
- **event_date**: 開催日（日付型）
- **venue**: 会場名（例：東京ビッグサイト、池袋サンシャインシティ）
- **application_start_date**: 申込開始日
- **application_end_date**: 申込締切日
- **description**: イベントの詳細説明（任意）

### 将来の拡張予定
1. **複数日開催対応**: 開催期間（開始日〜終了日）の管理
2. **会場詳細情報**: 住所、アクセス情報、駐車場情報
3. **イベント運営情報**: 主催者、公式サイト、連絡先
4. **参加費情報**: サークル参加費、一般参加費
5. **申込方式**: オンライン申込、抽選方式の詳細管理

## 関連テーブル

### 関連するテーブル
- **exhibits**: イベントと出展申込の1対多関係
- **exhibit_books**: 出展で頒布予定の書籍情報

### 外部キー制約
```sql
-- exhibitsテーブルから参照
ALTER TABLE exhibits 
ADD CONSTRAINT fk_exhibits_event_id 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
```

## 使用例

### イベントの作成
```typescript
const event = await drizzleService.db.insert(events).values({
  name: '技術書典17',
  eventDate: new Date('2024-07-27'),
  venue: '東京ビッグサイト 東展示棟',
  applicationStartDate: new Date('2024-05-01'),
  applicationEndDate: new Date('2024-05-31'),
  description: 'エンジニアが知見を共有し合う技術書オンリーイベント',
});
```

### イベントの検索
```typescript
// 申込受付中のイベント
const openEvents = await drizzleService.db.select()
  .from(events)
  .where(
    and(
      lte(events.applicationStartDate, new Date()),
      gte(events.applicationEndDate, new Date())
    )
  )
  .orderBy(events.eventDate);

// 今後開催予定のイベント
const upcomingEvents = await drizzleService.db.select()
  .from(events)
  .where(gte(events.eventDate, new Date()))
  .orderBy(events.eventDate);
```

### イベントの更新
```typescript
const updatedEvent = await drizzleService.db.update(events)
  .set({
    venue: '東京ビッグサイト 西展示棟',
    updatedAt: new Date(),
  })
  .where(eq(events.id, 1));
```