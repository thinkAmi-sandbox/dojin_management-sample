# サークル（Circles）テーブル設計

## テーブル定義

```sql
CREATE TABLE circles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  representative_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Drizzle ORM定義

```typescript
export const circles = pgTable('circles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  representativeName: varchar('representative_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## 設計方針

### 基本機能
- **サークル情報管理**: 同人誌制作グループの基本情報
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **必須情報**: サークル名、代表者名、連絡先メールアドレス
- **任意情報**: サークルの詳細説明
- **タイムスタンプ**: 作成日時と更新日時の自動管理

### 項目詳細
- **name**: サークル名（例：○○研究会、××制作委員会）
- **representative_name**: 代表者名（責任者の氏名）
- **email**: 連絡先メールアドレス（必須）
- **description**: サークルの活動内容や特色の説明（任意）

### 将来の拡張予定
1. **連絡先情報拡充**: 電話番号、住所、SNSアカウント
2. **サークル詳細情報**: 設立年、活動歴、専門分野
3. **公開プロフィール**: WebサイトURL、Twitter、Pixiv等
4. **活動実績**: 過去の出展履歴、頒布実績
5. **サークルカット**: 宣伝用画像データの管理

## 関連テーブル

### 関連するテーブル
- **exhibits**: サークルと出展申込の1対多関係
- **circle_authors**: サークルと執筆者の多対多関係
- **books**: サークルが制作した書籍（将来的な関連）

### 外部キー制約
```sql
-- exhibitsテーブルから参照
ALTER TABLE exhibits 
ADD CONSTRAINT fk_exhibits_circle_id 
FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;

-- circle_authorsテーブルから参照
ALTER TABLE circle_authors 
ADD CONSTRAINT fk_circle_authors_circle_id 
FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
```

## 使用例

### サークルの作成
```typescript
const circle = await drizzleService.db.insert(circles).values({
  name: 'Tech Writers Club',
  representativeName: '山田太郎',
  email: 'contact@techwriters.example.com',
  description: '技術書を中心とした執筆活動を行うサークルです。Web開発、インフラ、機械学習など幅広い分野の知見を共有しています。',
});
```

### サークルの検索
```typescript
// 名前による部分一致検索
const searchResults = await drizzleService.db.select()
  .from(circles)
  .where(ilike(circles.name, '%Tech%'))
  .orderBy(circles.name);

// 代表者による検索
const circlesByRep = await drizzleService.db.select()
  .from(circles)
  .where(ilike(circles.representativeName, '%山田%'))
  .orderBy(circles.createdAt);

// 全サークル一覧（作成日降順）
const allCircles = await drizzleService.db.select()
  .from(circles)
  .orderBy(desc(circles.createdAt));
```

### サークルの更新
```typescript
const updatedCircle = await drizzleService.db.update(circles)
  .set({
    email: 'new-contact@techwriters.example.com',
    description: '更新されたサークル説明文',
    updatedAt: new Date(),
  })
  .where(eq(circles.id, 1));
```

### 出展履歴との結合検索
```typescript
// サークルの出展履歴を含む情報取得
const circleWithExhibits = await drizzleService.db.select({
  circleId: circles.id,
  circleName: circles.name,
  representativeName: circles.representativeName,
  email: circles.email,
  exhibitId: exhibits.id,
  eventName: events.name,
  exhibitStatus: exhibits.status,
  spaceNumber: exhibits.spaceNumber,
})
.from(circles)
.leftJoin(exhibits, eq(circles.id, exhibits.circleId))
.leftJoin(events, eq(exhibits.eventId, events.id))
.where(eq(circles.id, 1))
.orderBy(desc(exhibits.applicationDate));
```

## バリデーション要件

### 必須項目チェック
- サークル名: 1文字以上255文字以内
- 代表者名: 1文字以上255文字以内  
- メールアドレス: 有効なメール形式

### 一意性制約
- 現在は設定なし（将来的にサークル名の重複チェックを検討）

### 形式チェック
- メールアドレス: RFC準拠の形式チェック
- 説明文: HTMLタグの無害化（XSS対策）