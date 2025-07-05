# 出展申込（Exhibits）テーブル設計

## テーブル定義

```sql
CREATE TABLE exhibits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  circle_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'applying',
  space_number VARCHAR(50),
  space_location VARCHAR(255),
  application_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
  UNIQUE(event_id, circle_id)
);
```

## Drizzle ORM定義

```typescript
export const exhibits = pgTable('exhibits', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  circleId: integer('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('applying'),
  spaceNumber: varchar('space_number', { length: 50 }),
  spaceLocation: varchar('space_location', { length: 255 }),
  applicationDate: date('application_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEventCircle: unique().on(table.eventId, table.circleId),
}));

// ステータスのenum定義
export const exhibitStatusEnum = pgEnum('exhibit_status', [
  'applying',   // 申込中
  'accepted',   // 当選
  'rejected',   // 落選
  'cancelled'   // キャンセル
]);
```

## 設計方針

### 基本機能
- **出展申込管理**: イベントとサークルを関連付けた申込情報
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **外部キー関係**: eventsテーブルとcirclesテーブルとの関連
- **ステータス管理**: 申込から当選・落選までの状態管理
- **一意性制約**: 同一イベントへの重複申込防止

### 項目詳細
- **event_id**: 申込対象のイベントID（外部キー）
- **circle_id**: 申込するサークルID（外部キー）
- **status**: 申込状態（applying/accepted/rejected/cancelled）
- **space_number**: スペース番号（当選時に設定）
- **space_location**: 配置詳細（例：東1ホール、ア-01）
- **application_date**: 申込日
- **notes**: 申込時の備考やメモ

### ステータス定義
1. **applying**: 申込中（初期状態）
2. **accepted**: 当選（スペース割り当て済み）
3. **rejected**: 落選
4. **cancelled**: キャンセル（申込者都合での取り下げ）

### 制約事項
- **一意性制約**: 1つのサークルは同一イベントに1回のみ申込可能
- **外部キー制約**: カスケード削除でデータ整合性を保持
- **必須項目**: イベント、サークル、申込日は必須

## 関連テーブル

### 親テーブル
- **events**: 申込対象のイベント情報
- **circles**: 申込するサークル情報

### 子テーブル
- **exhibit_books**: 出展で頒布予定の書籍情報（多対多関係）

### 外部キー制約
```sql
-- exhibit_booksテーブルから参照
ALTER TABLE exhibit_books 
ADD CONSTRAINT fk_exhibit_books_exhibit_id 
FOREIGN KEY (exhibit_id) REFERENCES exhibits(id) ON DELETE CASCADE;
```

## 使用例

### 出展申込の作成
```typescript
const exhibit = await drizzleService.db.insert(exhibits).values({
  eventId: 1, // 技術書典17
  circleId: 5, // Tech Writers Club
  status: 'applying',
  applicationDate: new Date('2024-05-15'),
  notes: '初回参加です。技術書を2冊頒布予定です。',
});
```

### 申込状況の検索
```typescript
// イベント別の申込一覧
const eventExhibits = await drizzleService.db.select({
  exhibitId: exhibits.id,
  circleName: circles.name,
  status: exhibits.status,
  applicationDate: exhibits.applicationDate,
  spaceNumber: exhibits.spaceNumber,
})
.from(exhibits)
.innerJoin(circles, eq(exhibits.circleId, circles.id))
.where(eq(exhibits.eventId, 1))
.orderBy(exhibits.applicationDate);

// サークル別の出展履歴
const circleExhibits = await drizzleService.db.select({
  exhibitId: exhibits.id,
  eventName: events.name,
  eventDate: events.eventDate,
  status: exhibits.status,
  spaceNumber: exhibits.spaceNumber,
})
.from(exhibits)
.innerJoin(events, eq(exhibits.eventId, events.id))
.where(eq(exhibits.circleId, 5))
.orderBy(desc(events.eventDate));

// 当選したサークル一覧
const acceptedExhibits = await drizzleService.db.select()
.from(exhibits)
.innerJoin(circles, eq(exhibits.circleId, circles.id))
.innerJoin(events, eq(exhibits.eventId, events.id))
.where(eq(exhibits.status, 'accepted'))
.orderBy(exhibits.spaceNumber);
```

### ステータス更新
```typescript
// 当選通知
const acceptExhibit = await drizzleService.db.update(exhibits)
  .set({
    status: 'accepted',
    spaceNumber: 'ア-15',
    spaceLocation: '東1ホール',
    updatedAt: new Date(),
  })
  .where(eq(exhibits.id, 1));

// キャンセル処理
const cancelExhibit = await drizzleService.db.update(exhibits)
  .set({
    status: 'cancelled',
    notes: 'サークル都合によりキャンセル',
    updatedAt: new Date(),
  })
  .where(eq(exhibits.id, 1));
```

### 集計クエリ
```typescript
// イベント別申込状況集計
const exhibitStats = await drizzleService.db.select({
  eventId: exhibits.eventId,
  eventName: events.name,
  totalApplications: count(exhibits.id),
  acceptedCount: count(case(eq(exhibits.status, 'accepted'), exhibits.id)),
  rejectedCount: count(case(eq(exhibits.status, 'rejected'), exhibits.id)),
})
.from(exhibits)
.innerJoin(events, eq(exhibits.eventId, events.id))
.groupBy(exhibits.eventId, events.name)
.orderBy(events.eventDate);
```

## バリデーション要件

### 必須項目チェック
- イベントID: 有効なevents.idへの参照
- サークルID: 有効なcircles.idへの参照
- 申込日: 有効な日付形式

### ビジネスルールチェック
- 申込期間内チェック: events.application_start_date ≤ application_date ≤ events.application_end_date
- 重複申込防止: 同一(event_id, circle_id)の組み合わせは1件のみ
- ステータス遷移チェック: 無効な状態変更を防止

### データ整合性
- 外部キー制約により、存在しないevent_idやcircle_idは挿入不可
- カスケード削除により、親レコード削除時に関連する申込も削除