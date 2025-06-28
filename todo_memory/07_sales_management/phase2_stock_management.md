# Phase 2: 在庫管理の版対応実装計画

## 📋 Phase 2 概要

Phase 2では、Phase 1で確立した版管理基盤を活用して、版ベースの在庫管理システムを実装します。保管場所管理、在庫管理、在庫移動履歴の3つの主要機能を段階的に構築し、版ごとの正確な在庫管理を実現します。

### 🎯 Phase 2の目標
- **保管場所管理**: 複数の保管場所（自宅、倉庫、委託先、イベント会場）の管理
- **版ベース在庫管理**: 版IDを基準とした場所別在庫管理
- **在庫移動履歴**: 在庫の移動記録とトレーサビリティの確保
- **版詳細連携**: 版詳細画面への在庫状況表示

### 🏗️ 実装戦略
- **TDD統合テスト駆動開発**: Phase 1で確立したパターンを踏襲
- **段階的実装**: 保管場所→在庫→移動履歴の順で段階的に構築
- **既存パターン活用**: 印刷所機能・版管理機能の成功パターンを参考
- **ValidationPipe統一**: Phase 1で確立した統一パターンを適用

## 📊 Phase 2 進捗状況

### ✅ Phase 2-1: 保管場所管理実装
- **✅ Phase 2-1 Step 1**: StorageLocationsテーブルスキーマ作成 （完了 2025年6月28日）
- **⏳ Phase 2-1 Step 2**: storage-locationsモジュール実装（TDD） （次のアクション）

### ⏳ Phase 2-2: Stocksテーブル・在庫管理基盤実装 （予定）
### ⏳ Phase 2-3: StockMovementsテーブル・在庫移動履歴実装 （予定）
### ⏳ Phase 2-4: 統合・検証・版詳細画面への在庫表示 （予定）

## 🗂️ Phase 2-1: 保管場所管理実装（1-2日）

### 前提条件
- **✅ Phase 1完了**: 版管理基盤の完全実装済み
- **✅ 版ID基盤**: editionIdを使った関連テーブル設計が可能

### Phase 2-1 Step 1: StorageLocationsテーブルスキーマ作成 ✅ 完了

**実装完了済み（2025年6月28日）**

#### データベーススキーマ実装
- **✅ storage_location_type enum作成**: 4つの保管場所タイプ定義
  - home: 自宅保管
  - warehouse: 倉庫保管
  - consignment: 委託先
  - event: イベント会場
- **✅ StorageLocationテーブル作成**: 保管場所管理用テーブル（9フィールド）
  - 基本情報: id, name, type, isConsignment
  - 詳細情報: address, contactInfo, notes
  - タイムスタンプ: createdAt, updatedAt
- **✅ 型定義**: StorageLocation, NewStorageLocation型をexport

#### 技術的検証完了
- **型チェック**: エラー0件 ✅
- **マイグレーション生成**: `0013_damp_nebula.sql` 生成 ✅
- **DB適用**: テスト用・プロダクション用両方成功 ✅
- **統合テスト**: 287/288テスト通過（StorageLocation関連正常動作） ✅

#### 実装されたStorageLocationテーブル仕様
```sql
CREATE TYPE "public"."storage_location_type" AS ENUM('home', 'warehouse', 'consignment', 'event');
CREATE TABLE "StorageLocation" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" "storage_location_type" NOT NULL,
  "isConsignment" boolean DEFAULT false NOT NULL,
  "address" text,
  "contactInfo" text,
  "notes" text,
  "createdAt" timestamp (3) DEFAULT now() NOT NULL,
  "updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
```

#### テストインフラ整備
- **testDbUtils.cleanupDatabase()**: StorageLocationテーブルのクリーンアップ処理追加

### Phase 2-1 Step 2: storage-locationsモジュール実装（TDD） ⏳ 次のアクション

#### 🎯 実装内容
**TDD統合テスト駆動実装**
- **統合テスト作成**: 完全CRUD機能テスト（4-6テスト）
  - 保管場所一覧表示
  - 新規保管場所作成（フォーム表示・作成処理）
  - 保管場所詳細表示・編集・削除
  - バリデーションエラーテスト

**プロダクションコード実装**
- **StorageLocationsService実装**: CRUD操作、型安全性確保
- **StorageLocationsController実装**: ValidationPipe統一パターン
- **DTO作成**: CreateStorageLocationDto, UpdateStorageLocationDto
- **ビューファイル4件作成**: 一覧、詳細、作成、編集

#### URLエンドポイント
- `GET /storage-locations` - 保管場所一覧
- `GET /storage-locations/new` - 新規保管場所フォーム
- `POST /storage-locations` - 保管場所作成
- `GET /storage-locations/:id` - 保管場所詳細
- `GET /storage-locations/:id/edit` - 保管場所編集フォーム
- `PUT /storage-locations/:id` - 保管場所更新
- `DELETE /storage-locations/:id` - 保管場所削除

#### DTO設計（参考）
```typescript
export class CreateStorageLocationDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '保管場所名は必須です' })
  @IsString({ message: '保管場所名は文字列で入力してください' })
  @MaxLength(255, { message: '保管場所名は255文字以内で入力してください' })
  name: string

  @IsEnum(StorageLocationType, { message: '保管場所タイプを選択してください' })
  type: 'home' | 'warehouse' | 'consignment' | 'event'

  @IsOptional()
  @IsBoolean({ message: '委託フラグはboolean値で入力してください' })
  isConsignment?: boolean

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '住所は文字列で入力してください' })
  @MaxLength(500, { message: '住所は500文字以内で入力してください' })
  address?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '連絡先情報は文字列で入力してください' })
  @MaxLength(500, { message: '連絡先情報は500文字以内で入力してください' })
  contactInfo?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
```

#### 技術的実装ポイント
- **Phase 1パターン踏襲**: 版管理機能の成功パターンを適用
- **ValidationPipe統一**: @Transform + class-validator統一パターン
- **HTTPメソッドオーバーライド**: PUT/DELETE処理の統一実装
- **エラーハンドリング**: NotFoundException + ParseIntPipe統一
- **ValidationExceptionFilter**: 保管場所管理パス対応追加

## 🗂️ Phase 2-2: 在庫管理基盤実装（2-3日）

### 前提条件
- **✅ Phase 2-1完了**: StorageLocationsテーブル・モジュール実装済み
- **✅ 版・保管場所連携**: editionId, locationIdの外部キー設計

### Step 1: Stocksテーブルスキーマ作成

#### データベーススキーマ設計
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

#### 設計ポイント
- **版ID参照**: editionIdでの版ベース在庫管理
- **保管場所ID参照**: locationIdでの場所別在庫
- **数量管理**: 総数量、予約済み、販売可能数量
- **最終確認日時**: 棚卸し管理用
- **制約**: 総数量 = 予約済み + 販売可能数量

#### マイグレーション・制約
```sql
-- 在庫数のマイナス防止
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_positive" 
CHECK ("quantity" >= 0 AND "reservedQuantity" >= 0 AND "availableQuantity" >= 0);

-- 在庫計算整合性
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_balance" 
CHECK ("quantity" = "reservedQuantity" + "availableQuantity");

-- パフォーマンス最適化用インデックス
CREATE INDEX idx_stocks_edition_location ON "Stock" ("editionId", "locationId");
```

### Step 2: stocksモジュール基盤実装（TDD）

#### TDD統合テスト作成（6-8テスト）
- **版別在庫一覧表示**: 特定版の全保管場所在庫表示
- **保管場所別在庫表示**: 特定保管場所の全版在庫表示
- **在庫数量更新・調整**: 在庫数の更新処理
- **在庫不足チェック**: 販売可能数量のチェック
- **在庫統計情報**: 総在庫数、場所別分布等
- **バリデーションテスト**: 数量制約、整合性チェック

#### プロダクションコード実装
- **StocksService実装**: 在庫照会、更新、調整機能
- **StocksController実装**: ValidationPipe統一パターン
- **DTO作成**: UpdateStockDto, StockCheckDto

#### URLエンドポイント
- `GET /stocks` - 在庫一覧（版別・場所別）
- `GET /stocks/check` - 棚卸画面
- `POST /stocks/check` - 棚卸実行
- `GET /editions/:id/stocks` - 特定版の在庫状況
- `PUT /stocks/:id` - 在庫数量更新

## 🗂️ Phase 2-3: 在庫移動履歴実装（2-3日）

### 前提条件
- **✅ Phase 2-2完了**: Stocksテーブル・在庫管理基盤実装済み
- **✅ トランザクション設計**: 在庫移動時の整合性保証準備

### Step 1: StockMovementsテーブルスキーマ作成

#### データベーススキーマ設計
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

#### 設計ポイント
- **移動タイプenum**: inbound, outbound, transfer, sale, return, adjustment, disposal
- **移動元・移動先**: fromLocationId, toLocationId参照
- **関連レコード参照**: referenceType, referenceId（販売ID、出展ID等）
- **移動理由・作成者**: トレーサビリティ確保

### Step 2: 在庫移動機能実装（TDD）

#### TDD統合テスト作成（6-8テスト）
- **在庫移動記録作成**: 移動記録の作成処理
- **移動履歴一覧表示**: 全在庫移動の履歴表示
- **版別移動履歴表示**: 特定版の移動履歴
- **トランザクション整合性確認**: 移動時の在庫数量整合性
- **移動タイプ別フィルタリング**: 移動タイプでの絞り込み
- **期間別履歴表示**: 指定期間の移動履歴

#### プロダクションコード実装
- **StockMovementsService実装**: 移動記録、履歴照会
- **在庫移動API実装**: トランザクション処理による整合性保証
- **履歴表示機能**: 各種フィルタリング・ソート機能

#### URLエンドポイント
- `GET /stocks/movements` - 在庫移動履歴
- `POST /stock-movements` - 在庫移動記録
- `GET /editions/:id/stock-movements` - 特定版の在庫移動履歴

#### トランザクション処理設計
```typescript
// 在庫移動処理の例
async moveStock(moveStockDto: MoveStockDto): Promise<void> {
  await this.drizzleService.db.transaction(async (tx) => {
    // 1. 移動元在庫から減少
    await tx.update(stocks)
      .set({ 
        quantity: sql`quantity - ${moveStockDto.quantity}`,
        availableQuantity: sql`available_quantity - ${moveStockDto.quantity}`
      })
      .where(and(
        eq(stocks.editionId, moveStockDto.editionId),
        eq(stocks.locationId, moveStockDto.fromLocationId)
      ))

    // 2. 移動先在庫に増加
    await tx.update(stocks)
      .set({ 
        quantity: sql`quantity + ${moveStockDto.quantity}`,
        availableQuantity: sql`available_quantity + ${moveStockDto.quantity}`
      })
      .where(and(
        eq(stocks.editionId, moveStockDto.editionId),
        eq(stocks.locationId, moveStockDto.toLocationId)
      ))

    // 3. 移動履歴記録
    await tx.insert(stockMovements).values({
      editionId: moveStockDto.editionId,
      fromLocationId: moveStockDto.fromLocationId,
      toLocationId: moveStockDto.toLocationId,
      quantity: moveStockDto.quantity,
      movementType: 'transfer',
      reason: moveStockDto.reason,
    })
  })
}
```

## 🗂️ Phase 2-4: 統合・検証・版詳細画面への在庫表示（1日）

### 前提条件
- **✅ Phase 2-1〜2-3完了**: 在庫管理機能の完全実装済み
- **✅ 版管理連携**: Phase 1の版詳細画面拡張準備

### Step 1: 全体統合テスト
- **版→在庫→移動フロー**: 一連の処理テスト
- **データ整合性確認**: 版削除時の在庫データ削除
- **エラーハンドリング検証**: 在庫不足、不正移動等

### Step 2: 版詳細画面への在庫表示機能追加
- **版詳細画面拡張**: 在庫状況セクション追加
- **在庫サマリー表示**: 場所別在庫数、総在庫数
- **在庫管理ボタン**: 在庫確認・移動へのリンク

#### 版詳細画面拡張内容
```html
<!-- 在庫状況セクション -->
<div class="detail-section">
  <div class="section-title">📦 在庫状況</div>
  <div class="stock-summary">
    <div class="total-stock">
      <strong>総在庫数: <%= edition.totalStock %>冊</strong>
    </div>
    <div class="stock-by-location">
      <% edition.stocksByLocation.forEach(stock => { %>
        <div class="stock-item">
          <span class="location-name"><%= stock.locationName %></span>:
          <span class="stock-quantity"><%= stock.quantity %>冊</span>
          <span class="available-quantity">（販売可能: <%= stock.availableQuantity %>冊）</span>
        </div>
      <% }) %>
    </div>
  </div>
  
  <!-- 在庫管理ボタン -->
  <div class="actions">
    <a href="/editions/<%= edition.id %>/stocks" class="btn btn-primary">
      📊 在庫詳細
    </a>
    <a href="/stocks/movements?editionId=<%= edition.id %>" class="btn btn-secondary">
      📋 移動履歴
    </a>
  </div>
</div>
```

### 完了条件
- **統合テスト**: 全在庫管理機能テスト通過
- **型チェック**: TypeScriptエラー0件
- **版ベース在庫管理**: 完全動作確認
- **書籍詳細→版詳細→在庫確認**: ユーザーフロー完成

## 📊 技術的実装ポイント

### CLAUDE.md準拠パターン
1. **実装前チェックリスト**: スキーマ確認→既存パターン分析→依存関係確認
2. **TDD段階的実装**: ミニマムテスト→失敗確認→実装→成功確認
3. **ValidationPipe統一**: @Transform + class-validator統一パターン
4. **エラーハンドリング**: NotFoundException + ParseIntPipe統一

### 既存パターン踏襲
- **参考実装**: 印刷所機能（完全CRUD）、版管理機能（関連テーブル）
- **ValidationExceptionFilter**: 在庫管理パス対応追加
- **HTTPメソッドオーバーライド**: PUT/DELETE処理の統一実装

### データ整合性保証
- **外部キー制約**: CASCADE DELETE設定による一貫性保持
- **トランザクション処理**: 在庫移動時の原子性保証
- **在庫計算**: 総数量 = 予約済み + 販売可能数量

### パフォーマンス最適化
- **インデックス設計**: 在庫照会用の複合インデックス
- **集計クエリ**: 在庫サマリー表示の効率化
- **JOIN最適化**: 版・保管場所・在庫の結合処理

## 🎯 Phase 2完了時の期待効果

### 機能面
- **版ベース在庫管理**: 版ごとの正確な在庫把握
- **場所別在庫管理**: 複数保管場所での在庫分散管理
- **移動履歴管理**: 在庫移動の完全なトレーサビリティ
- **統合ナビゲーション**: 書籍→版→在庫の一貫したユーザーフロー

### 技術面
- **拡張性**: 今後の販売管理機能への基盤提供
- **データ品質**: トランザクション処理による整合性保証
- **運用効率**: 棚卸し・在庫調整の自動化
- **監査性**: 全在庫移動の記録・追跡可能

---

**最終更新**: 2025年6月28日  
**次回更新予定**: Phase 2-1 Step 2完了時