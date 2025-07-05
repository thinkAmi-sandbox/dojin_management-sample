# サークルメンバー（CircleAuthors）テーブル設計

## テーブル定義

```sql
CREATE TABLE circle_authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  role VARCHAR(100) DEFAULT 'member',
  joined_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  UNIQUE(circle_id, author_id)
);
```

## Drizzle ORM定義

```typescript
export const circleAuthors = pgTable('circle_authors', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  circleId: integer('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => authors.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 100 }).default('member'),
  joinedDate: date('joined_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCircleAuthor: unique().on(table.circleId, table.authorId),
}));

// 役割のenum定義
export const circleRoleEnum = pgEnum('circle_role', [
  'representative', // 代表者
  'member',        // メンバー
  'guest',         // ゲスト執筆者
  'illustrator',   // イラストレーター
  'editor',        // 編集者
  'advisor'        // アドバイザー
]);
```

## 設計方針

### 基本機能
- **多対多関係管理**: サークルと執筆者の関連付け
- **役割管理**: サークル内での役割・責任の管理
- **自動採番ID**: PostgreSQLのautoincrement機能を使用
- **外部キー関係**: circlesテーブルとauthorsテーブルとの関連
- **一意性制約**: 同一サークル内での執筆者重複防止

### 項目詳細
- **circle_id**: サークルID（外部キー）
- **author_id**: 執筆者ID（外部キー）
- **role**: サークル内での役割（representative/member/guest/illustrator/editor/advisor）
- **joined_date**: サークル加入日
- **notes**: メンバー固有の備考（専門分野、担当章等）

### 役割定義
1. **representative**: 代表者（サークルの責任者）
2. **member**: 一般メンバー（正式なサークルメンバー）
3. **guest**: ゲスト執筆者（特定プロジェクトのみ参加）
4. **illustrator**: イラストレーター（表紙・挿絵担当）
5. **editor**: 編集者（文章校正・レイアウト担当）
6. **advisor**: アドバイザー（監修・助言担当）

### 制約事項
- **一意性制約**: 1つのサークルに同じ執筆者は1回のみ登録可能
- **外部キー制約**: カスケード削除でデータ整合性を保持
- **必須項目**: サークル、執筆者は必須

### 将来の拡張予定
1. **権限管理**: サークル管理画面へのアクセス権限制御
2. **活動期間管理**: 加入日・脱退日の範囲管理
3. **貢献度管理**: 執筆量、売上分配比率等の管理
4. **専門分野**: メンバーの得意分野・担当技術領域
5. **連絡先管理**: サークル内でのコミュニケーション方法

## 関連テーブル

### 親テーブル
- **circles**: サークルの基本情報
- **authors**: 執筆者の基本情報

### 関連クエリの例
```typescript
// サークルメンバー一覧の取得
const circleMembers = await drizzleService.db.select({
  memberId: circleAuthors.id,
  authorName: authors.name,
  authorEmail: authors.email,
  role: circleAuthors.role,
  joinedDate: circleAuthors.joinedDate,
  notes: circleAuthors.notes,
})
.from(circleAuthors)
.innerJoin(authors, eq(circleAuthors.authorId, authors.id))
.where(eq(circleAuthors.circleId, 1))
.orderBy(circleAuthors.role, authors.name);
```

## 使用例

### サークルメンバーの登録
```typescript
const circleAuthor = await drizzleService.db.insert(circleAuthors).values({
  circleId: 1,    // Tech Writers Club
  authorId: 5,    // 山田太郎
  role: 'representative',
  joinedDate: new Date('2023-01-15'),
  notes: 'サークル設立者。Web開発・インフラ担当。',
});
```

### 複数メンバーの一括登録
```typescript
const multipleMembers = await drizzleService.db.insert(circleAuthors).values([
  {
    circleId: 1,
    authorId: 5,
    role: 'representative',
    joinedDate: new Date('2023-01-15'),
    notes: 'サークル設立者。Web開発担当。',
  },
  {
    circleId: 1,
    authorId: 8,
    role: 'member',
    joinedDate: new Date('2023-03-01'),
    notes: '機械学習・AI分野担当。',
  },
  {
    circleId: 1,
    authorId: 12,
    role: 'illustrator',
    joinedDate: new Date('2023-05-10'),
    notes: '表紙イラスト・図版制作担当。',
  },
]);
```

### サークルメンバー情報の検索
```typescript
// サークル別メンバー一覧（役割順）
const membersByCircle = await drizzleService.db.select({
  memberId: circleAuthors.id,
  authorName: authors.name,
  authorEmail: authors.email,
  role: circleAuthors.role,
  joinedDate: circleAuthors.joinedDate,
  speciality: authors.profile,
})
.from(circleAuthors)
.innerJoin(authors, eq(circleAuthors.authorId, authors.id))
.where(eq(circleAuthors.circleId, 1))
.orderBy(
  // 代表者を最初に、その後は名前順
  case()
    .when(eq(circleAuthors.role, 'representative'), 1)
    .else(2),
  authors.name
);

// 執筆者別の所属サークル一覧
const circlesByAuthor = await drizzleService.db.select({
  circleId: circles.id,
  circleName: circles.name,
  role: circleAuthors.role,
  joinedDate: circleAuthors.joinedDate,
  representativeName: circles.representativeName,
})
.from(circleAuthors)
.innerJoin(circles, eq(circleAuthors.circleId, circles.id))
.where(eq(circleAuthors.authorId, 5))
.orderBy(desc(circleAuthors.joinedDate));

// 役割別メンバー数集計
const roleStats = await drizzleService.db.select({
  circleId: circleAuthors.circleId,
  circleName: circles.name,
  totalMembers: count(circleAuthors.id),
  representatives: count(case(eq(circleAuthors.role, 'representative'), circleAuthors.id)),
  members: count(case(eq(circleAuthors.role, 'member'), circleAuthors.id)),
  guests: count(case(eq(circleAuthors.role, 'guest'), circleAuthors.id)),
})
.from(circleAuthors)
.innerJoin(circles, eq(circleAuthors.circleId, circles.id))
.groupBy(circleAuthors.circleId, circles.name)
.orderBy(circles.name);
```

### メンバー情報の更新
```typescript
// 役割変更
const promoteToLeader = await drizzleService.db.update(circleAuthors)
  .set({
    role: 'representative',
    notes: '新代表者に就任。',
    updatedAt: new Date(),
  })
  .where(and(
    eq(circleAuthors.circleId, 1),
    eq(circleAuthors.authorId, 8)
  ));

// メンバー情報更新
const updateMemberInfo = await drizzleService.db.update(circleAuthors)
  .set({
    notes: '機械学習・AI分野に加えて、データサイエンス分野も担当。',
    updatedAt: new Date(),
  })
  .where(eq(circleAuthors.id, 2));
```

### メンバー削除（脱退処理）
```typescript
// サークルからの脱退
const removeMember = await drizzleService.db.delete(circleAuthors)
  .where(and(
    eq(circleAuthors.circleId, 1),
    eq(circleAuthors.authorId, 12)
  ));
```

### 高度な検索・分析
```typescript
// サークルとその代表者一覧
const circleLeaders = await drizzleService.db.select({
  circleId: circles.id,
  circleName: circles.name,
  leaderName: authors.name,
  leaderEmail: authors.email,
  joinedDate: circleAuthors.joinedDate,
})
.from(circles)
.innerJoin(circleAuthors, eq(circles.id, circleAuthors.circleId))
.innerJoin(authors, eq(circleAuthors.authorId, authors.id))
.where(eq(circleAuthors.role, 'representative'))
.orderBy(circles.name);

// 複数サークル所属者の特定
const multiCircleAuthors = await drizzleService.db.select({
  authorId: authors.id,
  authorName: authors.name,
  circleCount: count(circleAuthors.circleId),
})
.from(authors)
.innerJoin(circleAuthors, eq(authors.id, circleAuthors.authorId))
.groupBy(authors.id, authors.name)
.having(gt(count(circleAuthors.circleId), 1))
.orderBy(desc(count(circleAuthors.circleId)));

// アクティブなサークル分析（メンバー数による）
const activeCircles = await drizzleService.db.select({
  circleId: circles.id,
  circleName: circles.name,
  memberCount: count(circleAuthors.id),
  latestJoinDate: max(circleAuthors.joinedDate),
})
.from(circles)
.leftJoin(circleAuthors, eq(circles.id, circleAuthors.circleId))
.groupBy(circles.id, circles.name)
.orderBy(desc(count(circleAuthors.id)));
```

## バリデーション要件

### 必須項目チェック
- サークルID: 有効なcircles.idへの参照
- 執筆者ID: 有効なauthors.idへの参照
- 役割: 定義された役割enum値のいずれか

### ビジネスルールチェック
- 重複登録防止: 同一(circle_id, author_id)の組み合わせは1件のみ
- 代表者制限: 1つのサークルに代表者は1人のみ（推奨）
- 加入日妥当性: サークル設立日以降の日付

### データ整合性
- 外部キー制約により、存在しないcircle_idやauthor_idは挿入不可
- カスケード削除により、親レコード削除時に関連するメンバー情報も削除
- 役割の一貫性: 同一サークル内での権限体系の整合性確保