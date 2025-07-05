# 販売管理システム - データベース設計

## 概要

このドキュメントでは、販売管理システムで使用する全データベーステーブルの詳細設計を定義します。既存テーブルの修正と新規テーブルの追加により、版管理→在庫管理→販売管理の一貫したデータフローを実現します。

## データモデルの階層構造

```
書籍（Books）
├── 版（Editions）
    ├── 在庫（Stocks）
    ├── 販売明細（SalesDetails）
    └── 委託販売明細（ConsignmentSalesDetails）
```

## 新規テーブル設計

### 1. 版（Editions）テーブル ✅ 実装済み

```typescript
export const editions = pgTable('Edition', {
  id: serial('id').primaryKey(),
  bookId: integer('bookId').notNull().references(() => books.id, { onDelete: 'cascade' }),
  versionName: varchar('versionName', { length: 100 }).notNull(), // "初版", "第2版", "新装版"等
  versionNumber: integer('versionNumber').notNull().default(1), // 版番号（ソート用）
  isbn: varchar('isbn', { length: 13 }).unique(), // ISBN（版ごとに異なる）
  
  // 版ごとに変わる可能性のある情報
  pageCount: integer('pageCount'),
  basePrice: integer('basePrice').notNull(), // 基本価格（定価）
  printingCost: integer('printingCost'), // 印刷原価
  publishDate: date('publishDate'), // 発行日
  
  // 版の詳細情報
  editionNotes: text('editionNotes'), // 改訂内容、追加内容等
  coverImageUrl: varchar('coverImageUrl', { length: 500 }), // 表紙画像（版で異なる場合）
  
  // ステータス
  isActive: boolean('isActive').notNull().default(true), // 現行版かどうか
  isSoldOut: boolean('isSoldOut').notNull().default(false), // 完売フラグ
  
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

**実装状況**: ✅ 完了（2025年6月25日）
- マイグレーション: `0011_condemned_otto_octavius.sql`
- 外部キー制約: books.id への CASCADE DELETE
- 型定義: Edition, NewEdition型 export済み

### 2. 保管場所（StorageLocations）テーブル ✅ 実装済み

```typescript
export const storageLocationTypeEnum = pgEnum('storage_location_type', [
  'home',       // 自宅保管
  'warehouse',  // 倉庫保管
  'consignment', // 委託先
  'event',      // イベント会場
])

export const storageLocations = pgTable('StorageLocation', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: storageLocationTypeEnum('type').notNull(),
  isConsignment: boolean('isConsignment').notNull().default(false),
  address: text('address'),
  contactInfo: text('contactInfo'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

**実装状況**: ✅ 完了（2025年6月28日）
- マイグレーション: `0013_damp_nebula.sql`
- Enum定義: storage_location_type（4タイプ）
- 型定義: StorageLocation, NewStorageLocation型 export済み

### 3. 在庫（Stocks）テーブル ✅ 実装済み

```typescript
export const stocks = pgTable('Stock', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  locationId: integer('locationId').notNull().references(() => storageLocations.id),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reservedQuantity').notNull().default(0), // 予約済み数量
  availableQuantity: integer('availableQuantity').notNull().default(0), // 販売可能数量
  lastCheckedAt: timestamp('lastCheckedAt'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

**設計ポイント**:
- **版ID参照**: editionIdで版ベース在庫管理
- **保管場所ID参照**: locationIdで場所別在庫
- **数量管理**: 総数量、予約済み、販売可能数量
- **制約**: 総数量 = 予約済み + 販売可能数量

**実装状況**: ✅ 完了（2025年6月28日）
- マイグレーション: `0014_empty_blue_blade.sql`
- 外部キー制約: editions.id、storageLocations.id への参照
- 数量制約: 非負数チェック、計算整合性チェック
- ユニーク制約: (editionId, locationId) 組み合わせ重複防止
- インデックス: 版別・場所別検索最適化用4個
- 型定義: Stock, NewStock型 export済み

### 4. 在庫移動（StockMovements）テーブル

```typescript
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'inbound',      // 入庫（印刷所から納品）
  'outbound',     // 出庫（イベント/委託先へ）
  'transfer',     // 移動（場所間移動）
  'sale',         // 販売による減少
  'return',       // 返品による増加
  'adjustment',   // 棚卸調整
  'disposal',     // 廃棄
])

export const stockMovements = pgTable('StockMovement', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId').notNull().references(() => editions.id),
  fromLocationId: integer('fromLocationId').references(() => storageLocations.id),
  toLocationId: integer('toLocationId').references(() => storageLocations.id),
  quantity: integer('quantity').notNull(),
  movementType: stockMovementTypeEnum('movementType').notNull(),
  referenceType: varchar('referenceType', { length: 50 }), // 'sale', 'exhibit', 'consignment'
  referenceId: integer('referenceId'), // 関連するレコードのID
  reason: text('reason'),
  movedAt: timestamp('movedAt').notNull().defaultNow(),
  createdBy: varchar('createdBy', { length: 255 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
```

**設計ポイント**:
- **移動タイプ管理**: 7種類の移動タイプで分類
- **移動元・移動先**: 保管場所間の移動記録
- **関連レコード参照**: 販売ID、出展ID等への参照
- **トレーサビリティ**: 移動理由、作成者の記録

### 5. 販売取引（SalesTransactions）テーブル

```typescript
export const salesTransactionTypeEnum = pgEnum('sales_transaction_type', [
  'event',        // イベント直販
  'consignment',  // 委託販売
  'online',       // オンライン販売
  'direct',       // 個人間直接販売
])

export const salesTransactions = pgTable('SalesTransaction', {
  id: serial('id').primaryKey(),
  transactionType: salesTransactionTypeEnum('transactionType').notNull(),
  eventId: integer('eventId').references(() => events.id),
  exhibitId: integer('exhibitId').references(() => exhibits.id),
  locationId: integer('locationId').references(() => storageLocations.id),
  customerName: varchar('customerName', { length: 255 }),
  customerEmail: varchar('customerEmail', { length: 255 }),
  totalAmount: integer('totalAmount').notNull(),
  discountAmount: integer('discountAmount').default(0),
  finalAmount: integer('finalAmount').notNull(),
  paymentMethod: varchar('paymentMethod', { length: 50 }), // cash, credit, qr, etc
  transactionDate: timestamp('transactionDate').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

### 6. 販売明細（SalesDetails）テーブル

```typescript
export const salesDetails = pgTable('SalesDetail', {
  id: serial('id').primaryKey(),
  transactionId: integer('transactionId').notNull().references(() => salesTransactions.id, { onDelete: 'cascade' }),
  editionId: integer('editionId').notNull().references(() => editions.id), // 版を参照
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(),
  discountAmount: integer('discountAmount').default(0),
  subtotal: integer('subtotal').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
```

### 7. 委託契約（Consignments）テーブル

```typescript
export const consignments = pgTable('Consignment', {
  id: serial('id').primaryKey(),
  locationId: integer('locationId').notNull().references(() => storageLocations.id),
  storeName: varchar('storeName', { length: 255 }).notNull(),
  commissionRate: integer('commissionRate').notNull(), // パーセンテージ（例: 30 = 30%）
  settlementCycle: varchar('settlementCycle', { length: 50 }), // monthly, quarterly
  contractStartDate: date('contractStartDate').notNull(),
  contractEndDate: date('contractEndDate'),
  contactPerson: varchar('contactPerson', { length: 255 }),
  paymentInfo: text('paymentInfo'), // 振込先情報など
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

### 8. 委託販売報告（ConsignmentSales）テーブル

```typescript
export const consignmentSalesStatusEnum = pgEnum('consignment_sales_status', [
  'reported',     // 報告済み
  'confirmed',    // 確認済み
  'adjusted',     // 調整済み
  'settled',      // 精算済み
])

export const consignmentSales = pgTable('ConsignmentSales', {
  id: serial('id').primaryKey(),
  consignmentId: integer('consignmentId').notNull().references(() => consignments.id),
  reportPeriodStart: date('reportPeriodStart').notNull(),
  reportPeriodEnd: date('reportPeriodEnd').notNull(),
  totalSalesAmount: integer('totalSalesAmount').notNull(),
  commissionAmount: integer('commissionAmount').notNull(),
  netAmount: integer('netAmount').notNull(),
  status: consignmentSalesStatusEnum('status').notNull().default('reported'),
  reportedAt: timestamp('reportedAt').notNull().defaultNow(),
  confirmedAt: timestamp('confirmedAt'),
  settledAt: timestamp('settledAt'),
  settlementMethod: varchar('settlementMethod', { length: 50 }), // bank_transfer, cash, etc
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

### 9. 委託販売明細（ConsignmentSalesDetails）テーブル

```typescript
export const consignmentSalesDetails = pgTable('ConsignmentSalesDetail', {
  id: serial('id').primaryKey(),
  consignmentSalesId: integer('consignmentSalesId').notNull()
    .references(() => consignmentSales.id, { onDelete: 'cascade' }),
  editionId: integer('editionId').notNull().references(() => editions.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(),
  subtotal: integer('subtotal').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
```

### 10. 価格設定（PricingRules）テーブル

```typescript
export const pricingRuleTypeEnum = pgEnum('pricing_rule_type', [
  'event_discount',    // イベント割引
  'bulk_discount',     // まとめ買い割引
  'early_bird',        // 早期割引
  'consignment',       // 委託販売価格
])

export const pricingRules = pgTable('PricingRule', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId').notNull().references(() => editions.id),
  ruleType: pricingRuleTypeEnum('ruleType').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price'), // 固定価格の場合
  discountRate: integer('discountRate'), // 割引率（%）の場合
  minQuantity: integer('minQuantity'), // 最小購入数（まとめ買い用）
  eventId: integer('eventId').references(() => events.id), // イベント限定価格
  validFrom: date('validFrom'),
  validUntil: date('validUntil'),
  priority: integer('priority').notNull().default(0), // 優先順位
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

## 既存テーブルの修正

### 1. 書籍（Books）テーブルの調整 ✅ 実装済み

**削除フィールド**:
- `pageCount` → Editionsテーブルへ移動

**追加フィールド**:
```typescript
// 新規追加フィールド
genre: varchar('genre', { length: 100 }), // ジャンル（全版共通）
seriesName: varchar('seriesName', { length: 255 }), // シリーズ名
seriesNumber: integer('seriesNumber'), // シリーズ内番号
```

**実装状況**: ✅ 完了（2025年6月25日）
- マイグレーション: `0012_tough_bruce_banner.sql`
- pageCount参照削除: 既存コード・テストファイルから完全削除

### 2. 出展書籍（ExhibitBooks）テーブルの調整

**修正予定**:
- `bookId` → `editionId` に変更
- 以下のフィールドを追加：
  - `actualQuantity`: 実際の持ち込み数
  - `soldQuantity`: 売上数
  - `remainingQuantity`: 残数

**実装時期**: Phase 3で実装予定

## テーブル間の関係性

### 主要な関係
```
Books (1) ←→ (N) Editions
Editions (1) ←→ (N) Stocks
StorageLocations (1) ←→ (N) Stocks
Editions (1) ←→ (N) StockMovements
Editions (1) ←→ (N) SalesDetails
SalesTransactions (1) ←→ (N) SalesDetails
```

### 外部キー制約
- **CASCADE DELETE**: 上位テーブル削除時に関連データも削除
  - Books → Editions
  - Editions → Stocks, StockMovements, SalesDetails
  - SalesTransactions → SalesDetails
  - ConsignmentSales → ConsignmentSalesDetails

- **RESTRICT**: 参照データがある場合は削除不可
  - StorageLocations（在庫が存在する場合）

## マイグレーション戦略

### 段階的マイグレーション計画

#### Stage 1: 新テーブル作成（Phase 1-2完了済み）
- ✅ Editionsテーブル作成
- ✅ Booksテーブル修正
- ✅ StorageLocationsテーブル作成

#### Stage 2: 在庫管理テーブル作成（Phase 2進行中）
- ✅ Stocksテーブル作成（完了 2025年6月28日）
- ⏳ StockMovementsテーブル作成（予定）

#### Stage 3: 販売管理テーブル作成（Phase 4予定）
- SalesTransactionsテーブル作成
- SalesDetailsテーブル作成
- PricingRulesテーブル作成

#### Stage 4: 委託販売テーブル作成（Phase 5予定）
- Consignmentsテーブル作成
- ConsignmentSalesテーブル作成
- ConsignmentSalesDetailsテーブル作成

### データ移行手順

#### 既存データの移行（Phase 3実装時）
```sql
-- 1. 初版Editionの作成
INSERT INTO "Edition" (
  "bookId", 
  "versionName", 
  "versionNumber", 
  "pageCount", 
  "basePrice",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT 
  id,
  '初版',
  1,
  "pageCount",
  COALESCE("price", 0), -- priceフィールドがあれば使用
  true,
  "createdAt",
  "updatedAt"
FROM "Book";

-- 2. ExhibitBooksの更新（一時的に両方のIDを保持）
ALTER TABLE "ExhibitBook" ADD COLUMN "editionId" INTEGER;

UPDATE "ExhibitBook" eb
SET "editionId" = e.id
FROM "Edition" e
WHERE eb."bookId" = e."bookId" AND e."versionNumber" = 1;
```

## インデックス設計

### パフォーマンス最適化用インデックス
```sql
-- 在庫照会用
CREATE INDEX idx_stocks_edition_location ON "Stock" ("editionId", "locationId");
CREATE INDEX idx_stock_movements_edition ON "StockMovement" ("editionId");

-- 販売データ集計用
CREATE INDEX idx_sales_details_edition ON "SalesDetail" ("editionId");
CREATE INDEX idx_sales_transaction_date ON "SalesTransaction" ("transactionDate");

-- 委託販売報告用
CREATE INDEX idx_consignment_sales_period ON "ConsignmentSales" ("reportPeriodStart", "reportPeriodEnd");
```

## 制約とバリデーション

### データベース制約
```sql
-- 在庫数のマイナス防止
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_positive" 
CHECK ("quantity" >= 0 AND "reservedQuantity" >= 0 AND "availableQuantity" >= 0);

-- 在庫計算整合性
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_balance" 
CHECK ("quantity" = "reservedQuantity" + "availableQuantity");

-- 価格の妥当性
ALTER TABLE "Edition" ADD CONSTRAINT "chk_base_price_positive" 
CHECK ("basePrice" > 0);

-- 日付の論理チェック
ALTER TABLE "Consignment" ADD CONSTRAINT "chk_contract_dates" 
CHECK ("contractStartDate" <= "contractEndDate");
```

### アプリケーションレベルバリデーション
- 在庫移動時の数量チェック
- 販売時の在庫不足チェック
- 委託手数料率の範囲チェック（0-100%）
- 価格ルールの重複チェック

---

**最終更新**: 2025年6月28日  
**次回更新予定**: Phase 2-3 在庫移動履歴テーブル実装時