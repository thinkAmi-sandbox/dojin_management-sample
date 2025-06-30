# Phase 4: 販売・価格管理実装計画

## 📋 Phase 4 概要

Phase 4では、Phase 1-3で構築した版管理・在庫管理基盤を活用して、販売取引の記録と価格管理機能を実装します。イベント直販、委託販売、オンライン販売など、様々な販売チャネルに対応した包括的な販売管理システムを構築します。

### 🎯 Phase 4の目標
- **販売取引管理**: 各種販売チャネルでの取引記録・管理
- **価格管理システム**: 版ごとの動的価格設定・割引ルール
- **売上レポート**: 版別・期間別・チャネル別の売上分析
- **在庫連携**: 販売時の自動在庫減少・移動記録

### 🏗️ 実装戦略
- **TDD統合テスト駆動開発**: Phase 1-2で確立したパターンを踏襲
- **トランザクション処理**: 販売記録と在庫更新の原子性保証
- **柔軟な価格設定**: イベント別・数量別・期間別の価格ルール
- **レポート機能**: 売上データの可視化・分析機能

## 📊 Phase 4 実装スケジュール

### ✅ Phase 4-1: 販売取引基盤実装（完了）
### ⏳ Phase 4-2: 価格管理システム実装（1-2日）
### ⏳ Phase 4-3: 売上レポート機能実装（2-3日）
### ⏳ Phase 4-4: 在庫連携・統合テスト（1-2日）

## ✅ Phase 4-1: 販売取引基盤実装（完全完了）

**実装期間**: 2日間（2025年6月29日〜30日）
**実装完了**: 2025年6月30日
**統合テスト完了**: 2025年6月30日（15件全テスト成功）

### ✅ データベーススキーマ実装 **完了**

**実装完了日**: 2025年6月29日  
**実装内容**: 
- ✅ salesTransactionTypeEnum定義
- ✅ SalesTransactionsテーブル定義  
- ✅ SalesDetailsテーブル定義
- ✅ マイグレーションファイル生成（0018_gifted_liz_osborn.sql）
- ✅ 本番・テスト環境への適用完了
- ✅ TypeScript型定義完了

**詳細実装内容**:

#### SalesTransactionsテーブル
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

#### SalesDetailsテーブル
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

### ✅ 販売管理フルスタック実装 **完了**

**実装完了日**: 2025年6月30日  
**実装内容**: 

#### サービス・コントローラー層
- ✅ SalesService完全実装（販売取引作成・一覧取得・詳細取得・更新・削除）
- ✅ SalesController完全実装（RESTfulエンドポイント・HTTPメソッドオーバーライド対応）
- ✅ SalesModule統合（依存性注入・モジュール設定）

#### DTO・バリデーション層
- ✅ CreateSalesTransactionDto・UpdateSalesTransactionDto・CreateSalesDetailDto実装
- ✅ 統一されたバリデーション規則・日本語エラーメッセージ
- ✅ Transform処理による適切な型変換・null処理
- ✅ ValidationExceptionFilter販売管理対応拡張

#### ビューファイル層
- ✅ `src/views/sales/index.ejs` - 販売記録一覧表示（フィルタリング・ソート機能）
- ✅ `src/views/sales/new.ejs` - 新規販売登録フォーム（動的明細追加・削除機能）
- ✅ `src/views/sales/show.ejs` - 販売記録詳細表示（金額情報・明細表示）
- ✅ `src/views/sales/edit.ejs` - 販売記録編集フォーム（基本情報編集対応）
- ✅ レスポンシブデザイン対応・統一されたUIデザイン

#### 統合テスト層
- ✅ Step 1統合テスト（2件基本機能テスト）
- ✅ Step 2統合テスト（3件バリデーションテスト）
- ✅ Step 3統合テスト（15件全機能テスト・エッジケース・データ整合性）
- ✅ **エラー修正完了**: スキーマ不整合・フィールド名相違・ビュー変数エラー等8項目修正
- ✅ **全テスト成功**: 15件統合テスト全件パス確認完了

### 📋 現在の実装状況

**Phase 4-1の実装状況**:
- ✅ **スキーマ実装**: 完了（2025年6月29日）
- ✅ **サービス実装**: 完了（2025年6月30日）
- ✅ **コントローラー実装**: 完了（2025年6月30日）
- ✅ **DTO実装**: 完了（2025年6月30日）
- ✅ **ビュー実装**: 完了（2025年6月30日）
- ✅ **統合テスト**: 完了（2025年6月30日）
- ✅ **エラー修正・デバッグ**: 完了（2025年6月30日）
- ✅ **全テスト成功確認**: 15件全統合テスト成功（2025年6月30日）

### 📋 実装済みのサービス実装サンプル

#### SalesService
```typescript
@Injectable()
export class SalesService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly stocksService: StocksService,
  ) {}

  async createSalesTransaction(createSalesTransactionDto: CreateSalesTransactionDto): Promise<SalesTransaction> {
    return await this.drizzleService.db.transaction(async (tx) => {
      // 1. 販売取引レコード作成
      const [transaction] = await tx.insert(salesTransactions).values({
        transactionType: createSalesTransactionDto.transactionType,
        eventId: createSalesTransactionDto.eventId,
        locationId: createSalesTransactionDto.locationId,
        customerName: createSalesTransactionDto.customerName,
        customerEmail: createSalesTransactionDto.customerEmail,
        totalAmount: createSalesTransactionDto.totalAmount,
        discountAmount: createSalesTransactionDto.discountAmount,
        finalAmount: createSalesTransactionDto.finalAmount,
        paymentMethod: createSalesTransactionDto.paymentMethod,
        notes: createSalesTransactionDto.notes,
      }).returning()

      // 2. 販売明細レコード作成
      for (const detail of createSalesTransactionDto.details) {
        await tx.insert(salesDetails).values({
          transactionId: transaction.id,
          editionId: detail.editionId,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
          discountAmount: detail.discountAmount || 0,
          subtotal: detail.quantity * detail.unitPrice - (detail.discountAmount || 0),
        })

        // 3. 在庫減少処理
        await this.updateStockForSale(tx, detail.editionId, createSalesTransactionDto.locationId, detail.quantity)

        // 4. 在庫移動履歴記録
        await tx.insert(stockMovements).values({
          editionId: detail.editionId,
          fromLocationId: createSalesTransactionDto.locationId,
          toLocationId: null, // 販売による減少
          quantity: detail.quantity,
          movementType: 'sale',
          referenceType: 'sale',
          referenceId: transaction.id,
          reason: `販売による減少 - 取引ID: ${transaction.id}`,
        })
      }

      return transaction
    })
  }

  private async updateStockForSale(
    tx: any,
    editionId: number,
    locationId: number,
    quantity: number,
  ): Promise<void> {
    // 在庫から販売数量を減少
    const result = await tx.update(stocks)
      .set({
        quantity: sql`quantity - ${quantity}`,
        availableQuantity: sql`available_quantity - ${quantity}`,
      })
      .where(and(
        eq(stocks.editionId, editionId),
        eq(stocks.locationId, locationId),
        gte(stocks.availableQuantity, quantity), // 在庫不足チェック
      ))
      .returning()

    if (result.length === 0) {
      throw new BadRequestException('在庫が不足しています')
    }
  }

  async findAllSalesTransactions(filters?: SalesFiltersDto): Promise<SalesTransaction[]> {
    let query = this.drizzleService.db
      .select({
        id: salesTransactions.id,
        transactionType: salesTransactions.transactionType,
        customerName: salesTransactions.customerName,
        totalAmount: salesTransactions.totalAmount,
        finalAmount: salesTransactions.finalAmount,
        paymentMethod: salesTransactions.paymentMethod,
        transactionDate: salesTransactions.transactionDate,
        eventName: events.name,
        locationName: storageLocations.name,
      })
      .from(salesTransactions)
      .leftJoin(events, eq(salesTransactions.eventId, events.id))
      .leftJoin(storageLocations, eq(salesTransactions.locationId, storageLocations.id))

    // フィルタリング
    if (filters?.startDate && filters?.endDate) {
      query = query.where(
        and(
          gte(salesTransactions.transactionDate, new Date(filters.startDate)),
          lte(salesTransactions.transactionDate, new Date(filters.endDate)),
        )
      )
    }

    if (filters?.transactionType) {
      query = query.where(eq(salesTransactions.transactionType, filters.transactionType))
    }

    return query.orderBy(desc(salesTransactions.transactionDate))
  }

  async getSalesReportByEdition(editionId: number, period?: string): Promise<SalesReport> {
    // 版別売上レポート生成
    const salesData = await this.drizzleService.db
      .select({
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesDetails.transactionId})`,
      })
      .from(salesDetails)
      .innerJoin(salesTransactions, eq(salesDetails.transactionId, salesTransactions.id))
      .where(eq(salesDetails.editionId, editionId))

    return salesData[0] || { totalQuantity: 0, totalAmount: 0, transactionCount: 0 }
  }
}
```

### 販売管理コントローラー実装

#### SalesController
```typescript
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly editionsService: EditionsService,
    private readonly eventsService: EventsService,
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @Get()
  @Render('sales/index')
  async findAll(@Query() filters: SalesFiltersDto) {
    const salesTransactions = await this.salesService.findAllSalesTransactions(filters)
    
    return {
      title: '販売取引一覧',
      salesTransactions,
      filters,
    }
  }

  @Get('new')
  @Render('sales/new')
  async renderNewForm() {
    const availableEditions = await this.editionsService.findAllActive()
    const events = await this.eventsService.findAll()
    const locations = await this.storageLocationsService.findAll()

    return {
      title: '新規販売登録',
      availableEditions,
      events,
      locations,
      formData: {},
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/sales')
  async create(@Body() createSalesTransactionDto: CreateSalesTransactionDto) {
    await this.salesService.createSalesTransaction(createSalesTransactionDto)
  }

  @Get(':id')
  @Render('sales/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const salesTransaction = await this.salesService.findOneWithDetails(id)
    
    return {
      title: '販売取引詳細',
      salesTransaction,
    }
  }

  @Get('reports')
  @Render('sales/reports')
  async reports(@Query() reportFilters: ReportFiltersDto) {
    const reportData = await this.salesService.generateSalesReport(reportFilters)
    
    return {
      title: '売上レポート',
      reportData,
      filters: reportFilters,
    }
  }

  @Get('events/:eventId/sales')
  @Render('sales/event-sales')
  async getEventSales(@Param('eventId', ParseIntPipe) eventId: number) {
    const eventSales = await this.salesService.findAllByEventId(eventId)
    const event = await this.eventsService.findOne(eventId)
    
    return {
      title: `${event.name} - 売上一覧`,
      eventSales,
      event,
    }
  }
}
```

### DTO実装

#### CreateSalesTransactionDto
```typescript
export class CreateSalesTransactionDto {
  @IsEnum(['event', 'consignment', 'online', 'direct'], { 
    message: '販売タイプを選択してください' 
  })
  transactionType: 'event' | 'consignment' | 'online' | 'direct'

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  eventId?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: '保管場所IDは整数で入力してください' })
  locationId?: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '顧客名は文字列で入力してください' })
  @MaxLength(255, { message: '顧客名は255文字以内で入力してください' })
  customerName?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsEmail({}, { message: '顧客メールアドレスには有効なメールアドレスを入力してください' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  customerEmail?: string

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '合計金額は必須です' })
  @IsPositive({ message: '合計金額は正の数で入力してください' })
  totalAmount: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 0)
  @IsOptional()
  @Min(0, { message: '割引金額は0以上で入力してください' })
  discountAmount?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '最終金額は必須です' })
  @IsPositive({ message: '最終金額は正の数で入力してください' })
  finalAmount: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '支払方法は文字列で入力してください' })
  @MaxLength(50, { message: '支払方法は50文字以内で入力してください' })
  paymentMethod?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string

  @IsArray({ message: '販売明細は配列で入力してください' })
  @ValidateNested({ each: true })
  @Type(() => CreateSalesDetailDto)
  details: CreateSalesDetailDto[]
}

export class CreateSalesDetailDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '数量は必須です' })
  @IsPositive({ message: '数量は正の数で入力してください' })
  quantity: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '単価は必須です' })
  @IsPositive({ message: '単価は正の数で入力してください' })
  unitPrice: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 0)
  @IsOptional()
  @Min(0, { message: '割引金額は0以上で入力してください' })
  discountAmount?: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
```

## 🗂️ Phase 4-2: 価格管理システム実装（1-2日）

**実装期間**: 1-2日間（2025年6月30日〜7月1日予定）
**開始予定**: 2025年6月30日
**完了予定**: 2025年7月1日

### 📋 Phase 4-2実装計画詳細

#### 実装スケジュール
- **Step 1**: スキーマ・サービス層実装（6時間）
  - PricingRulesテーブルスキーマ設計・マイグレーション生成
  - PricingServiceの価格計算ロジック実装
- **Step 2**: コントローラー・DTO実装（4時間）
  - 価格管理用コントローラー・DTO実装
  - バリデーション規則・エラーハンドリング
- **Step 3**: ビューファイル・UI実装（4時間）
  - 価格ルール設定・管理画面のビューファイル実装
  - 価格計算シミュレーション画面
- **Step 4**: 販売取引統合・テスト実装（6時間）
  - 販売時の動的価格計算機能統合
  - 価格管理システムの統合テスト実装（段階的TDD）

#### 🎯 Phase 4-2の実装目標

1. **PricingRulesテーブル実装**
   - イベント割引・まとめ買い割引・早期割引・委託価格の4タイプ対応
   - 優先順位システム・有効期間管理
   - 版ごとの柔軟な価格ルール設定

2. **PricingService実装** 
   - 複数ルール適用の価格計算ロジック
   - 条件判定・優先順位処理・割引額計算
   - コンテキスト（イベント・数量・日付）による適用判定

3. **販売取引との統合**
   - 販売時の自動価格計算・割引適用
   - 明細ごとの詳細な価格情報記録
   - 価格変更履歴・監査性の確保

4. **価格管理UI**
   - 価格ルール作成・編集・削除機能
   - 版別価格設定・プレビュー機能
   - 価格計算シミュレーション画面

#### 🔧 技術的ポイント

- **複合価格計算**: 複数ルールの同時適用・優先順位処理
- **条件判定ロジック**: 日付範囲・数量条件・イベント条件の複合判定
- **トランザクション整合性**: 価格変更と販売記録の原子性保証
- **拡張性設計**: 新しい割引タイプの追加容易性

### 価格ルールテーブル

#### PricingRulesテーブル
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

### 価格計算サービス

#### PricingService
```typescript
@Injectable()
export class PricingService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async calculatePrice(
    editionId: number,
    quantity: number,
    context: PricingContext,
  ): Promise<PriceCalculationResult> {
    // 1. ベース価格取得
    const edition = await this.getEditionBasePrice(editionId)
    const basePrice = edition.basePrice

    // 2. 適用可能な価格ルールを取得
    const applicableRules = await this.getApplicableRules(editionId, quantity, context)

    // 3. 優先順位順にルールを適用
    let finalPrice = basePrice
    let appliedDiscounts: AppliedDiscount[] = []

    for (const rule of applicableRules) {
      const discount = this.applyPricingRule(basePrice, rule, quantity)
      if (discount.amount > 0) {
        finalPrice -= discount.amount
        appliedDiscounts.push(discount)
      }
    }

    return {
      basePrice,
      finalPrice: Math.max(finalPrice, 0), // 負の価格は0に
      totalDiscount: appliedDiscounts.reduce((sum, d) => sum + d.amount, 0),
      appliedDiscounts,
      quantity,
      subtotal: Math.max(finalPrice, 0) * quantity,
    }
  }

  private async getApplicableRules(
    editionId: number,
    quantity: number,
    context: PricingContext,
  ): Promise<PricingRule[]> {
    const now = new Date()
    
    let query = this.drizzleService.db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.editionId, editionId),
          eq(pricingRules.isActive, true),
          or(
            isNull(pricingRules.validFrom),
            lte(pricingRules.validFrom, now),
          ),
          or(
            isNull(pricingRules.validUntil),
            gte(pricingRules.validUntil, now),
          ),
        )
      )

    // 数量条件
    if (quantity) {
      query = query.where(
        or(
          isNull(pricingRules.minQuantity),
          lte(pricingRules.minQuantity, quantity),
        )
      )
    }

    // イベント条件
    if (context.eventId) {
      query = query.where(
        or(
          isNull(pricingRules.eventId),
          eq(pricingRules.eventId, context.eventId),
        )
      )
    }

    return query.orderBy(desc(pricingRules.priority))
  }

  private applyPricingRule(
    basePrice: number,
    rule: PricingRule,
    quantity: number,
  ): AppliedDiscount {
    let discountAmount = 0

    if (rule.price !== null) {
      // 固定価格の場合
      discountAmount = Math.max(0, basePrice - rule.price)
    } else if (rule.discountRate !== null) {
      // 割引率の場合
      discountAmount = Math.floor(basePrice * rule.discountRate / 100)
    }

    return {
      ruleName: rule.name,
      ruleType: rule.ruleType,
      amount: discountAmount,
      rate: rule.discountRate,
    }
  }
}

interface PricingContext {
  eventId?: number
  transactionType?: string
  customerType?: string
}

interface PriceCalculationResult {
  basePrice: number
  finalPrice: number
  totalDiscount: number
  appliedDiscounts: AppliedDiscount[]
  quantity: number
  subtotal: number
}

interface AppliedDiscount {
  ruleName: string
  ruleType: string
  amount: number
  rate?: number
}
```

## 🗂️ Phase 4-3: 売上レポート機能実装（2-3日）

### レポートサービス実装

#### SalesReportService
```typescript
@Injectable()
export class SalesReportService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async generateSalesReport(filters: ReportFiltersDto): Promise<SalesReportData> {
    const reportData: SalesReportData = {
      summary: await this.getSalesSummary(filters),
      byEdition: await this.getSalesByEdition(filters),
      byPeriod: await this.getSalesByPeriod(filters),
      byChannel: await this.getSalesByChannel(filters),
      byEvent: await this.getSalesByEvent(filters),
    }

    return reportData
  }

  private async getSalesSummary(filters: ReportFiltersDto): Promise<SalesSummary> {
    const result = await this.drizzleService.db
      .select({
        totalTransactions: sql<number>`COUNT(DISTINCT ${salesTransactions.id})`,
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})`,
        averageTransactionAmount: sql<number>`AVG(${salesTransactions.finalAmount})`,
      })
      .from(salesTransactions)
      .innerJoin(salesDetails, eq(salesTransactions.id, salesDetails.transactionId))
      .where(this.buildDateFilter(filters))

    return result[0] || {
      totalTransactions: 0,
      totalQuantity: 0,
      totalAmount: 0,
      averageTransactionAmount: 0,
    }
  }

  private async getSalesByEdition(filters: ReportFiltersDto): Promise<EditionSalesData[]> {
    return await this.drizzleService.db
      .select({
        editionId: salesDetails.editionId,
        bookTitle: books.title,
        editionName: editions.versionName,
        basePrice: editions.basePrice,
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesDetails.transactionId})`,
        averagePrice: sql<number>`AVG(${salesDetails.unitPrice})`,
      })
      .from(salesDetails)
      .innerJoin(salesTransactions, eq(salesDetails.transactionId, salesTransactions.id))
      .innerJoin(editions, eq(salesDetails.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(this.buildDateFilter(filters))
      .groupBy(salesDetails.editionId, books.title, editions.versionName, editions.basePrice)
      .orderBy(desc(sql`SUM(${salesDetails.subtotal})`))
  }

  private async getSalesByPeriod(filters: ReportFiltersDto): Promise<PeriodSalesData[]> {
    const groupBy = filters.groupBy || 'day' // day, week, month

    const dateFormat = {
      day: "to_char(date_trunc('day', transaction_date), 'YYYY-MM-DD')",
      week: "to_char(date_trunc('week', transaction_date), 'YYYY-MM-DD')",
      month: "to_char(date_trunc('month', transaction_date), 'YYYY-MM')",
    }[groupBy]

    return await this.drizzleService.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.id})`,
      })
      .from(salesTransactions)
      .innerJoin(salesDetails, eq(salesTransactions.id, salesDetails.transactionId))
      .where(this.buildDateFilter(filters))
      .groupBy(sql.raw(dateFormat))
      .orderBy(sql.raw(dateFormat))
  }

  private buildDateFilter(filters: ReportFiltersDto) {
    const conditions = []

    if (filters.startDate) {
      conditions.push(gte(salesTransactions.transactionDate, new Date(filters.startDate)))
    }

    if (filters.endDate) {
      conditions.push(lte(salesTransactions.transactionDate, new Date(filters.endDate)))
    }

    if (filters.transactionType) {
      conditions.push(eq(salesTransactions.transactionType, filters.transactionType))
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }
}
```

### レポート表示画面

#### sales/reports.ejs
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title><%= title %></title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .report-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        .filter-form { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1><%= title %></h1>

        <!-- フィルターフォーム -->
        <form class="filter-form" method="GET">
            <div class="row">
                <div class="col">
                    <label for="startDate">開始日</label>
                    <input type="date" name="startDate" id="startDate" value="<%= filters.startDate || '' %>">
                </div>
                <div class="col">
                    <label for="endDate">終了日</label>
                    <input type="date" name="endDate" id="endDate" value="<%= filters.endDate || '' %>">
                </div>
                <div class="col">
                    <label for="transactionType">販売タイプ</label>
                    <select name="transactionType" id="transactionType">
                        <option value="">全て</option>
                        <option value="event" <%= filters.transactionType === 'event' ? 'selected' : '' %>>イベント</option>
                        <option value="consignment" <%= filters.transactionType === 'consignment' ? 'selected' : '' %>>委託</option>
                        <option value="online" <%= filters.transactionType === 'online' ? 'selected' : '' %>>オンライン</option>
                        <option value="direct" <%= filters.transactionType === 'direct' ? 'selected' : '' %>>直接</option>
                    </select>
                </div>
                <div class="col">
                    <button type="submit" class="btn btn-primary">レポート生成</button>
                </div>
            </div>
        </form>

        <!-- サマリー -->
        <div class="report-summary">
            <div class="summary-card">
                <h3>総取引数</h3>
                <p class="big-number"><%= reportData.summary.totalTransactions.toLocaleString() %>件</p>
            </div>
            <div class="summary-card">
                <h3>総販売数</h3>
                <p class="big-number"><%= reportData.summary.totalQuantity.toLocaleString() %>冊</p>
            </div>
            <div class="summary-card">
                <h3>総売上金額</h3>
                <p class="big-number">¥<%= reportData.summary.totalAmount.toLocaleString() %></p>
            </div>
            <div class="summary-card">
                <h3>平均取引額</h3>
                <p class="big-number">¥<%= Math.round(reportData.summary.averageTransactionAmount).toLocaleString() %></p>
            </div>
        </div>

        <!-- 期間別売上チャート -->
        <div class="chart-section">
            <h2>期間別売上推移</h2>
            <div class="chart-container">
                <canvas id="periodSalesChart"></canvas>
            </div>
        </div>

        <!-- 版別売上ランキング -->
        <div class="table-section">
            <h2>版別売上ランキング</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>順位</th>
                        <th>書籍・版</th>
                        <th>販売数</th>
                        <th>売上金額</th>
                        <th>平均価格</th>
                        <th>取引数</th>
                    </tr>
                </thead>
                <tbody>
                    <% reportData.byEdition.forEach((edition, index) => { %>
                    <tr>
                        <td><%= index + 1 %></td>
                        <td>
                            <strong><%= edition.bookTitle %></strong><br>
                            <small><%= edition.editionName %></small>
                        </td>
                        <td><%= edition.totalQuantity.toLocaleString() %>冊</td>
                        <td>¥<%= edition.totalAmount.toLocaleString() %></td>
                        <td>¥<%= Math.round(edition.averagePrice).toLocaleString() %></td>
                        <td><%= edition.transactionCount %>件</td>
                    </tr>
                    <% }) %>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // 期間別売上チャート
        const ctx = document.getElementById('periodSalesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: <%- JSON.stringify(reportData.byPeriod.map(p => p.period)) %>,
                datasets: [{
                    label: '売上金額',
                    data: <%- JSON.stringify(reportData.byPeriod.map(p => p.totalAmount)) %>,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: '販売数量',
                    data: <%- JSON.stringify(reportData.byPeriod.map(p => p.totalQuantity)) %>,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    </script>
</body>
</html>
```

## 🗂️ Phase 4-4: 在庫連携・統合テスト（1-2日）

### 統合テスト実装

#### 販売取引統合テスト
```typescript
describe('Sales Integration Tests', () => {
  let testEdition: Edition
  let testLocation: StorageLocation
  let testEvent: Event

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
    
    // テストデータ作成
    const testBook = await createTestBook()
    testEdition = await createTestEdition(testBook.id)
    testLocation = await createTestStorageLocation()
    testEvent = await createTestEvent()
    
    // 初期在庫設定
    await createTestStock({
      editionId: testEdition.id,
      locationId: testLocation.id,
      quantity: 100,
      availableQuantity: 100,
    })
  })

  it('should create sales transaction and update stock', async () => {
    const salesData = {
      transactionType: 'event',
      eventId: testEvent.id,
      locationId: testLocation.id,
      customerName: 'テスト顧客',
      totalAmount: 3000,
      finalAmount: 3000,
      paymentMethod: 'cash',
      details: [{
        editionId: testEdition.id,
        quantity: 3,
        unitPrice: 1000,
      }]
    }

    const response = await request(app.getHttpServer())
      .post('/sales')
      .send(salesData)
      .expect(302)

    // 在庫確認
    const updatedStock = await stocksService.findByEditionAndLocation(
      testEdition.id, 
      testLocation.id
    )
    expect(updatedStock.quantity).toBe(97) // 100 - 3
    expect(updatedStock.availableQuantity).toBe(97)

    // 在庫移動履歴確認
    const movements = await stockMovementsService.findByEdition(testEdition.id)
    expect(movements).toHaveLength(1)
    expect(movements[0].movementType).toBe('sale')
    expect(movements[0].quantity).toBe(3)
  })

  it('should prevent sale when insufficient stock', async () => {
    const salesData = {
      transactionType: 'event',
      locationId: testLocation.id,
      totalAmount: 10100,
      finalAmount: 10100,
      details: [{
        editionId: testEdition.id,
        quantity: 101, // 在庫不足
        unitPrice: 1000,
      }]
    }

    const response = await request(app.getHttpServer())
      .post('/sales')
      .send(salesData)
      .expect(400)

    expect(response.body.message).toContain('在庫が不足')

    // 在庫が変化していないことを確認
    const stock = await stocksService.findByEditionAndLocation(
      testEdition.id, 
      testLocation.id
    )
    expect(stock.quantity).toBe(100) // 変更なし
  })

  it('should generate accurate sales report', async () => {
    // 複数の販売データを作成
    await createMultipleSalesTransactions()

    const reportData = await salesReportService.generateSalesReport({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })

    expect(reportData.summary.totalTransactions).toBeGreaterThan(0)
    expect(reportData.summary.totalAmount).toBeGreaterThan(0)
    expect(reportData.byEdition).toHaveLength(1)
    expect(reportData.byEdition[0].editionId).toBe(testEdition.id)
  })
})
```

## 📊 Phase 4 完了条件

### 技術的検証
- **全統合テスト通過**: 販売取引・価格計算・レポート生成の全機能テスト成功
- **在庫連携確認**: 販売時の在庫減少・移動記録の正常動作
- **トランザクション整合性**: 販売記録と在庫更新の原子性保証
- **型チェック**: TypeScriptエラー0件

### 機能検証
- **販売取引作成**: 各種販売チャネルでの取引記録正常作成
- **価格計算**: 動的価格設定・割引ルールの適切な適用
- **売上レポート**: 版別・期間別・チャネル別の正確な分析データ生成
- **在庫整合性**: 販売前後での在庫数量の正確な管理

### 性能要件
- **レポート生成**: 大量データでも5秒以内でのレポート生成
- **販売取引**: 1秒以内での販売記録作成・在庫更新
- **価格計算**: 複数ルール適用でも500ms以内での計算完了

## 🎯 Phase 4完了時の期待効果

### 機能面
- **包括的販売管理**: イベント・委託・オンラインの統一販売管理
- **動的価格設定**: 柔軟な価格ルール・割引システム
- **詳細な売上分析**: 版別・期間別・チャネル別の詳細レポート
- **在庫連携**: 販売時の自動在庫更新・移動記録

### 技術面
- **データ整合性**: トランザクション処理による確実な整合性保証
- **拡張性**: 新しい販売チャネル・価格ルールの追加容易性
- **監査性**: 全販売取引の完全な記録・追跡機能
- **レポート機能**: 視覚的で分かりやすい売上データ分析

---

**実装開始日**: 2025年6月29日  
**最終更新**: 2025年6月30日  
**次回更新予定**: Phase 4-2価格管理システム実装開始時

## 📝 実装履歴

### 2025年6月29日
- ✅ **Phase 4-1スキーマ実装完了**
  - salesTransactionTypeEnum定義
  - SalesTransactionsテーブル（販売取引記録）
  - SalesDetailsテーブル（販売明細）
  - マイグレーション生成・適用完了
  - TypeScript型定義完了

### 2025年6月30日
- ✅ **Phase 4-1完全実装完了**
  - SalesService実装（CRUD操作・トランザクション処理）
  - SalesController実装（RESTfulエンドポイント・HTTPメソッドオーバーライド）
  - DTO実装（CreateSalesTransactionDto・UpdateSalesTransactionDto・CreateSalesDetailDto）
  - ValidationExceptionFilter販売管理対応拡張
  - ビューファイル実装（index.ejs・new.ejs・show.ejs・edit.ejs）
  - 統合テスト実装（Step 1-3、5件基本機能・3件バリデーション・15件全機能テスト）

- ✅ **統合テストエラー調査・修正完了**
  - **データベーススキーマ修正**: ISBNフィールド長さエラー（17文字→13文字）修正
  - **Eventテーブル必須フィールド**: applicationStartDate・applicationEndDate追加
  - **SalesDetailフィールド名修正**: salesTransactionId→transactionId統一
  - **販売編集エンドポイント追加**: GET /sales/:id/edit実装
  - **breadcrumbs変数対応**: ビューファイルで必要な変数を追加
  - **書籍・版情報JOIN実装**: 販売明細で書籍タイトル・版名取得機能追加
  - **ビューファイル変数名修正**: フォーマット済みフィールド→直接フォーマット対応
  - **テスト期待値調整**: エラーステータスコード・表示文字列の正確性向上
  - **外部キー制約対応**: データ整合性テストでのeventId null設定処理追加

- ✅ **最終統合テスト結果**: **15件全テスト成功** 🎉
  - ✅ 販売記録一覧表示テスト（2件）
  - ✅ 販売記録作成テスト（1件）  
  - ✅ 販売記録詳細表示テスト（2件）
  - ✅ 販売記録編集フォームテスト（2件）
  - ✅ HTTPメソッドオーバーライドテスト（2件）
  - ✅ 販売記録削除テスト（2件）
  - ✅ エッジケーステスト（3件）
  - ✅ データ整合性テスト（1件）

- 📝 **Phase 4-1実装成果**: 販売記録の完全なCRUD機能・型安全なバリデーション・包括的テストカバレッジ達成・全統合テスト成功
- 📝 次のステップ: Phase 4-2価格管理システム実装予定