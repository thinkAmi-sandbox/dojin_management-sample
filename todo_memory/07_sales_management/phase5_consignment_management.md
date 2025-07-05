# Phase 5: 委託販売管理実装計画

## 📋 Phase 5 概要

Phase 5では、委託販売の包括的な管理機能を実装します。委託先との契約管理、販売報告の記録、精算処理など、委託販売特有の複雑な業務フローに対応した機能を構築し、Phase 4までで構築した販売管理基盤との統合を図ります。

### 🎯 Phase 5の目標
- **委託契約管理**: 委託先との契約条件・手数料率の管理
- **委託販売報告**: 委託先からの販売報告記録・確認機能
- **精算処理**: 手数料計算・支払処理の自動化
- **委託在庫管理**: 委託先での在庫状況・移動履歴の追跡

### 🏗️ 実装戦略
- **TDD統合テスト駆動開発**: テストファーストアプローチで品質保証
  - 統合テストを先に作成し、失敗することを確認
  - 最小限の実装でテストを通す（GREEN）
  - リファクタリングでコード品質向上
- **ワークフロー管理**: 報告→確認→調整→精算の段階的処理
- **既存機能統合**: 在庫管理・販売管理との緊密な連携
- **委託先ポータル**: 将来的な委託先向けWebインターフェース準備

### 🔄 テストファースト実装フロー
1. **RED**: 失敗する統合テストを先に作成
2. **GREEN**: 最小限の実装でテストを通す
3. **REFACTOR**: コードの品質向上・重複除去
4. **REPEAT**: 機能を段階的に追加

## 📊 Phase 5 実装スケジュール（総計：7-11日）

### ⏳ Phase 5-1: 委託契約管理実装（2-3日）
- [ ] 委託契約管理の統合テスト作成（失敗するテストを先に書く）
- [ ] Consignmentsテーブルのスキーマ実装
- [ ] ConsignmentsServiceの実装（テストが通るように実装）
- [ ] ConsignmentsControllerの実装（テストが通るように実装）
- [ ] CreateConsignmentDto/UpdateConsignmentDtoの実装
- [ ] 委託契約管理用ビューファイルの作成
- [ ] 全統合テストがグリーンになることを確認

### ⏳ Phase 5-2: 委託販売報告システム実装（2-3日）
- [ ] 委託販売報告の統合テスト作成（失敗するテストを先に書く）
- [ ] ConsignmentSales/ConsignmentSalesDetailsテーブルのスキーマ実装
- [ ] ConsignmentSalesServiceの実装（テストが通るように実装）
- [ ] ConsignmentReportsControllerの実装
- [ ] 販売報告関連DTOの実装
- [ ] 販売報告管理用ビューファイルの作成
- [ ] 全統合テストがグリーンになることを確認

### ⏳ Phase 5-3: 精算処理システム実装（2-3日）
- [ ] 精算ワークフローの統合テスト作成（失敗するテストを先に書く）
- [ ] 精算ワークフロー実装（報告→確認→調整→精算）
- [ ] 精算処理システムの実装
- [ ] 精算レポート・ダッシュボードの実装
- [ ] 全統合テストがグリーンになることを確認

### ⏳ Phase 5-4: 委託在庫管理・統合テスト（1-2日）
- [ ] 委託在庫管理の統合テスト作成
- [ ] 委託在庫管理機能の実装
- [ ] 全機能統合テストの実行・確認
- [ ] 最終確認とドキュメント更新

## 🗂️ Phase 5-1: 委託契約管理実装（2-3日）

### データベーススキーマ実装

#### Consignmentsテーブル
```typescript
export const consignments = pgTable('Consignment', {
  id: serial('id').primaryKey(),
  locationId: integer('locationId').notNull().references(() => storageLocations.id),
  storeName: varchar('storeName', { length: 255 }).notNull(),
  commissionRate: integer('commissionRate').notNull(), // パーセンテージ（例: 30 = 30%）
  settlementCycle: varchar('settlementCycle', { length: 50 }), // monthly, quarterly, custom
  contractStartDate: date('contractStartDate').notNull(),
  contractEndDate: date('contractEndDate'),
  contactPerson: varchar('contactPerson', { length: 255 }),
  contactEmail: varchar('contactEmail', { length: 255 }),
  contactPhone: varchar('contactPhone', { length: 50 }),
  paymentInfo: text('paymentInfo'), // 振込先情報など
  contractTerms: text('contractTerms'), // 契約条件詳細
  notes: text('notes'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

### 委託契約管理サービス実装

#### ConsignmentsService
```typescript
@Injectable()
export class ConsignmentsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  async create(createConsignmentDto: CreateConsignmentDto): Promise<Consignment> {
    // 保管場所を委託タイプに設定
    await this.storageLocationsService.update(createConsignmentDto.locationId, {
      type: 'consignment',
      isConsignment: true,
    })

    const [consignment] = await this.drizzleService.db
      .insert(consignments)
      .values({
        locationId: createConsignmentDto.locationId,
        storeName: createConsignmentDto.storeName,
        commissionRate: createConsignmentDto.commissionRate,
        settlementCycle: createConsignmentDto.settlementCycle,
        contractStartDate: new Date(createConsignmentDto.contractStartDate),
        contractEndDate: createConsignmentDto.contractEndDate 
          ? new Date(createConsignmentDto.contractEndDate) 
          : null,
        contactPerson: createConsignmentDto.contactPerson,
        contactEmail: createConsignmentDto.contactEmail,
        contactPhone: createConsignmentDto.contactPhone,
        paymentInfo: createConsignmentDto.paymentInfo,
        contractTerms: createConsignmentDto.contractTerms,
        notes: createConsignmentDto.notes,
      })
      .returning()

    return consignment
  }

  async findAll(): Promise<ConsignmentWithLocation[]> {
    return await this.drizzleService.db
      .select({
        id: consignments.id,
        storeName: consignments.storeName,
        commissionRate: consignments.commissionRate,
        settlementCycle: consignments.settlementCycle,
        contractStartDate: consignments.contractStartDate,
        contractEndDate: consignments.contractEndDate,
        contactPerson: consignments.contactPerson,
        isActive: consignments.isActive,
        locationName: storageLocations.name,
        locationAddress: storageLocations.address,
        createdAt: consignments.createdAt,
      })
      .from(consignments)
      .innerJoin(storageLocations, eq(consignments.locationId, storageLocations.id))
      .orderBy(desc(consignments.createdAt))
  }

  async findOne(id: number): Promise<ConsignmentDetail> {
    const result = await this.drizzleService.db
      .select({
        id: consignments.id,
        locationId: consignments.locationId,
        storeName: consignments.storeName,
        commissionRate: consignments.commissionRate,
        settlementCycle: consignments.settlementCycle,
        contractStartDate: consignments.contractStartDate,
        contractEndDate: consignments.contractEndDate,
        contactPerson: consignments.contactPerson,
        contactEmail: consignments.contactEmail,
        contactPhone: consignments.contactPhone,
        paymentInfo: consignments.paymentInfo,
        contractTerms: consignments.contractTerms,
        notes: consignments.notes,
        isActive: consignments.isActive,
        locationName: storageLocations.name,
        locationAddress: storageLocations.address,
        createdAt: consignments.createdAt,
        updatedAt: consignments.updatedAt,
      })
      .from(consignments)
      .innerJoin(storageLocations, eq(consignments.locationId, storageLocations.id))
      .where(eq(consignments.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('委託契約が見つかりません')
    }

    // 委託先の在庫状況も取得
    const stockStatus = await this.getConsignmentStockStatus(id)

    return {
      ...result[0],
      stockStatus,
    }
  }

  async update(id: number, updateConsignmentDto: UpdateConsignmentDto): Promise<Consignment> {
    // 存在確認
    await this.findOne(id)

    const [updatedConsignment] = await this.drizzleService.db
      .update(consignments)
      .set({
        storeName: updateConsignmentDto.storeName,
        commissionRate: updateConsignmentDto.commissionRate,
        settlementCycle: updateConsignmentDto.settlementCycle,
        contractEndDate: updateConsignmentDto.contractEndDate 
          ? new Date(updateConsignmentDto.contractEndDate) 
          : null,
        contactPerson: updateConsignmentDto.contactPerson,
        contactEmail: updateConsignmentDto.contactEmail,
        contactPhone: updateConsignmentDto.contactPhone,
        paymentInfo: updateConsignmentDto.paymentInfo,
        contractTerms: updateConsignmentDto.contractTerms,
        notes: updateConsignmentDto.notes,
        isActive: updateConsignmentDto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(consignments.id, id))
      .returning()

    return updatedConsignment
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    const consignment = await this.findOne(id)
    
    // 未精算の販売報告がないかチェック
    const unsettledSales = await this.checkUnsettledSales(id)
    if (unsettledSales > 0) {
      throw new BadRequestException('未精算の販売報告があるため削除できません')
    }

    // 委託先在庫がないかチェック
    const stockCount = await this.checkConsignmentStock(consignment.locationId)
    if (stockCount > 0) {
      throw new BadRequestException('委託先に在庫があるため削除できません')
    }

    await this.drizzleService.db
      .delete(consignments)
      .where(eq(consignments.id, id))
  }

  private async getConsignmentStockStatus(consignmentId: number): Promise<ConsignmentStockStatus> {
    const consignment = await this.findOne(consignmentId)
    
    const stockData = await this.drizzleService.db
      .select({
        totalBooks: sql<number>`COUNT(DISTINCT ${stocks.editionId})`,
        totalQuantity: sql<number>`SUM(${stocks.quantity})`,
        totalValue: sql<number>`SUM(${stocks.quantity} * ${editions.basePrice})`,
      })
      .from(stocks)
      .innerJoin(editions, eq(stocks.editionId, editions.id))
      .where(eq(stocks.locationId, consignment.locationId))

    return stockData[0] || { totalBooks: 0, totalQuantity: 0, totalValue: 0 }
  }

  private async checkUnsettledSales(consignmentId: number): Promise<number> {
    const result = await this.drizzleService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(consignmentSales)
      .where(
        and(
          eq(consignmentSales.consignmentId, consignmentId),
          ne(consignmentSales.status, 'settled')
        )
      )

    return result[0].count
  }

  private async checkConsignmentStock(locationId: number): Promise<number> {
    const result = await this.drizzleService.db
      .select({ count: sql<number>`SUM(${stocks.quantity})` })
      .from(stocks)
      .where(eq(stocks.locationId, locationId))

    return result[0].count || 0
  }
}
```

### 委託契約管理コントローラー実装

#### ConsignmentsController
```typescript
@Controller('consignments')
export class ConsignmentsController {
  constructor(
    private readonly consignmentsService: ConsignmentsService,
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @Get()
  @Render('consignments/index')
  async findAll() {
    const consignments = await this.consignmentsService.findAll()
    
    return {
      title: '委託契約一覧',
      consignments,
    }
  }

  @Get('new')
  @Render('consignments/new')
  async renderNewForm() {
    const availableLocations = await this.storageLocationsService.findNonConsignment()
    
    return {
      title: '新規委託契約',
      availableLocations,
      formData: {},
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/consignments')
  async create(@Body() createConsignmentDto: CreateConsignmentDto) {
    await this.consignmentsService.create(createConsignmentDto)
  }

  @Get(':id')
  @Render('consignments/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const consignment = await this.consignmentsService.findOne(id)
    
    // 委託先の売上実績も取得
    const salesHistory = await this.consignmentSalesService.findByConsignmentId(id)
    
    return {
      title: '委託契約詳細',
      consignment,
      salesHistory,
    }
  }

  @Get(':id/edit')
  @Render('consignments/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const consignment = await this.consignmentsService.findOne(id)
    
    return {
      title: '委託契約編集',
      consignment,
      formData: consignment,
    }
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsignmentDto: UpdateConsignmentDto,
  ) {
    await this.consignmentsService.update(id, updateConsignmentDto)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.consignmentsService.remove(id)
      res.redirect('/consignments')
    } catch (error) {
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).send(error.message)
      }
      throw error
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateConsignmentDto,
      })
      await this.consignmentsService.update(id, validatedDto)
      return res.redirect(`/consignments/${id}`)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }
}
```

### DTO実装

#### CreateConsignmentDto
```typescript
export class CreateConsignmentDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '保管場所は必須です' })
  @IsInt({ message: '保管場所IDは整数で入力してください' })
  locationId: number

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '店舗名は必須です' })
  @IsString({ message: '店舗名は文字列で入力してください' })
  @MaxLength(255, { message: '店舗名は255文字以内で入力してください' })
  storeName: string

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '手数料率は必須です' })
  @IsInt({ message: '手数料率は整数で入力してください' })
  @Min(0, { message: '手数料率は0以上で入力してください' })
  @Max(100, { message: '手数料率は100以下で入力してください' })
  commissionRate: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '精算サイクルは文字列で入力してください' })
  @MaxLength(50, { message: '精算サイクルは50文字以内で入力してください' })
  settlementCycle?: string

  @IsNotEmpty({ message: '契約開始日は必須です' })
  @IsDateString({}, { message: '契約開始日には有効な日付を入力してください' })
  contractStartDate: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsDateString({}, { message: '契約終了日には有効な日付を入力してください' })
  contractEndDate?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '担当者名は文字列で入力してください' })
  @MaxLength(255, { message: '担当者名は255文字以内で入力してください' })
  contactPerson?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsEmail({}, { message: '連絡先メールアドレスには有効なメールアドレスを入力してください' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  contactEmail?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '電話番号は文字列で入力してください' })
  @MaxLength(50, { message: '電話番号は50文字以内で入力してください' })
  contactPhone?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '支払情報は文字列で入力してください' })
  paymentInfo?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '契約条件は文字列で入力してください' })
  contractTerms?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}

export class UpdateConsignmentDto extends PartialType(CreateConsignmentDto) {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean({ message: 'アクティブフラグはboolean値で入力してください' })
  isActive?: boolean
}
```

## 🗂️ Phase 5-2: 委託販売報告システム実装（2-3日）

### データベーススキーマ実装

#### ConsignmentSalesテーブル
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
  adjustedAt: timestamp('adjustedAt'),
  settledAt: timestamp('settledAt'),
  settlementMethod: varchar('settlementMethod', { length: 50 }), // bank_transfer, cash, etc
  adjustmentReason: text('adjustmentReason'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
})
```

#### ConsignmentSalesDetailsテーブル
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

### 委託販売報告サービス実装

#### ConsignmentSalesService
```typescript
@Injectable()
export class ConsignmentSalesService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly stocksService: StocksService,
  ) {}

  async reportSales(reportSalesDto: ReportConsignmentSalesDto): Promise<ConsignmentSales> {
    return await this.drizzleService.db.transaction(async (tx) => {
      // 1. 手数料・純額計算
      const consignment = await this.getConsignmentById(reportSalesDto.consignmentId)
      const commissionAmount = Math.floor(reportSalesDto.totalSalesAmount * consignment.commissionRate / 100)
      const netAmount = reportSalesDto.totalSalesAmount - commissionAmount

      // 2. 委託販売レポート作成
      const [salesReport] = await tx.insert(consignmentSales).values({
        consignmentId: reportSalesDto.consignmentId,
        reportPeriodStart: new Date(reportSalesDto.reportPeriodStart),
        reportPeriodEnd: new Date(reportSalesDto.reportPeriodEnd),
        totalSalesAmount: reportSalesDto.totalSalesAmount,
        commissionAmount,
        netAmount,
        status: 'reported',
        notes: reportSalesDto.notes,
      }).returning()

      // 3. 販売明細作成
      for (const detail of reportSalesDto.details) {
        await tx.insert(consignmentSalesDetails).values({
          consignmentSalesId: salesReport.id,
          editionId: detail.editionId,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
          subtotal: detail.quantity * detail.unitPrice,
        })

        // 4. 委託先在庫から減少
        await this.updateConsignmentStock(tx, detail.editionId, consignment.locationId, detail.quantity)

        // 5. 在庫移動履歴記録
        await tx.insert(stockMovements).values({
          editionId: detail.editionId,
          fromLocationId: consignment.locationId,
          toLocationId: null, // 委託販売による減少
          quantity: detail.quantity,
          movementType: 'sale',
          referenceType: 'consignment_sale',
          referenceId: salesReport.id,
          reason: `委託販売による減少 - ${consignment.storeName}`,
        })
      }

      return salesReport
    })
  }

  async confirmSales(salesId: number, confirmDto: ConfirmConsignmentSalesDto): Promise<ConsignmentSales> {
    const salesReport = await this.findOne(salesId)
    
    if (salesReport.status !== 'reported') {
      throw new BadRequestException('報告済み状態の販売報告のみ確認できます')
    }

    const [confirmedSales] = await this.drizzleService.db
      .update(consignmentSales)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        notes: confirmDto.notes ? 
          `${salesReport.notes || ''}\n[確認時追記] ${confirmDto.notes}` : 
          salesReport.notes,
      })
      .where(eq(consignmentSales.id, salesId))
      .returning()

    return confirmedSales
  }

  async adjustSales(salesId: number, adjustDto: AdjustConsignmentSalesDto): Promise<ConsignmentSales> {
    const salesReport = await this.findOne(salesId)
    
    if (!['confirmed', 'adjusted'].includes(salesReport.status)) {
      throw new BadRequestException('確認済みまたは調整済み状態の販売報告のみ調整できます')
    }

    return await this.drizzleService.db.transaction(async (tx) => {
      // 金額調整の場合は手数料・純額を再計算
      let updateData: any = {
        status: 'adjusted',
        adjustedAt: new Date(),
        adjustmentReason: adjustDto.adjustmentReason,
      }

      if (adjustDto.adjustedSalesAmount !== undefined) {
        const consignment = await this.getConsignmentById(salesReport.consignmentId)
        const newCommissionAmount = Math.floor(adjustDto.adjustedSalesAmount * consignment.commissionRate / 100)
        const newNetAmount = adjustDto.adjustedSalesAmount - newCommissionAmount

        updateData = {
          ...updateData,
          totalSalesAmount: adjustDto.adjustedSalesAmount,
          commissionAmount: newCommissionAmount,
          netAmount: newNetAmount,
        }
      }

      const [adjustedSales] = await tx.update(consignmentSales)
        .set(updateData)
        .where(eq(consignmentSales.id, salesId))
        .returning()

      return adjustedSales
    })
  }

  async settleSales(salesId: number, settleDto: SettleConsignmentSalesDto): Promise<ConsignmentSales> {
    const salesReport = await this.findOne(salesId)
    
    if (!['confirmed', 'adjusted'].includes(salesReport.status)) {
      throw new BadRequestException('確認済みまたは調整済み状態の販売報告のみ精算できます')
    }

    const [settledSales] = await this.drizzleService.db
      .update(consignmentSales)
      .set({
        status: 'settled',
        settledAt: new Date(),
        settlementMethod: settleDto.settlementMethod,
        notes: settleDto.notes ? 
          `${salesReport.notes || ''}\n[精算時追記] ${settleDto.notes}` : 
          salesReport.notes,
      })
      .where(eq(consignmentSales.id, salesId))
      .returning()

    return settledSales
  }

  async findByConsignmentId(consignmentId: number): Promise<ConsignmentSalesWithDetails[]> {
    return await this.drizzleService.db
      .select({
        id: consignmentSales.id,
        reportPeriodStart: consignmentSales.reportPeriodStart,
        reportPeriodEnd: consignmentSales.reportPeriodEnd,
        totalSalesAmount: consignmentSales.totalSalesAmount,
        commissionAmount: consignmentSales.commissionAmount,
        netAmount: consignmentSales.netAmount,
        status: consignmentSales.status,
        reportedAt: consignmentSales.reportedAt,
        settledAt: consignmentSales.settledAt,
      })
      .from(consignmentSales)
      .where(eq(consignmentSales.consignmentId, consignmentId))
      .orderBy(desc(consignmentSales.reportPeriodEnd))
  }

  async generateSettlementReport(consignmentId: number, period?: string): Promise<SettlementReport> {
    // 期間別精算レポート生成
    const settlementData = await this.drizzleService.db
      .select({
        totalReports: sql<number>`COUNT(*)`,
        totalSalesAmount: sql<number>`SUM(${consignmentSales.totalSalesAmount})`,
        totalCommissionAmount: sql<number>`SUM(${consignmentSales.commissionAmount})`,
        totalNetAmount: sql<number>`SUM(${consignmentSales.netAmount})`,
        settledAmount: sql<number>`SUM(CASE WHEN ${consignmentSales.status} = 'settled' THEN ${consignmentSales.netAmount} ELSE 0 END)`,
        unsettledAmount: sql<number>`SUM(CASE WHEN ${consignmentSales.status} != 'settled' THEN ${consignmentSales.netAmount} ELSE 0 END)`,
      })
      .from(consignmentSales)
      .where(eq(consignmentSales.consignmentId, consignmentId))

    return settlementData[0] || {
      totalReports: 0,
      totalSalesAmount: 0,
      totalCommissionAmount: 0,
      totalNetAmount: 0,
      settledAmount: 0,
      unsettledAmount: 0,
    }
  }

  private async updateConsignmentStock(
    tx: any,
    editionId: number,
    locationId: number,
    quantity: number,
  ): Promise<void> {
    const result = await tx.update(stocks)
      .set({
        quantity: sql`quantity - ${quantity}`,
        availableQuantity: sql`available_quantity - ${quantity}`,
      })
      .where(and(
        eq(stocks.editionId, editionId),
        eq(stocks.locationId, locationId),
        gte(stocks.quantity, quantity),
      ))
      .returning()

    if (result.length === 0) {
      throw new BadRequestException(`委託先在庫が不足しています（版ID: ${editionId}）`)
    }
  }
}
```

## 🗂️ Phase 5-3: 精算処理システム実装（2-3日）

### 精算処理ワークフロー

#### 精算ステータス管理
```typescript
export enum ConsignmentSalesStatus {
  REPORTED = 'reported',    // 委託先から報告済み
  CONFIRMED = 'confirmed',  // 内容確認済み
  ADJUSTED = 'adjusted',    // 調整済み（金額修正等）
  SETTLED = 'settled',      // 精算完了
}

export interface SettlementWorkflow {
  // 1. 報告受理 (REPORTED)
  reportSales(reportData: ReportData): Promise<ConsignmentSales>
  
  // 2. 内容確認 (CONFIRMED)
  confirmSales(salesId: number, confirmData: ConfirmData): Promise<ConsignmentSales>
  
  // 3. 調整処理 (ADJUSTED) ※必要に応じて
  adjustSales(salesId: number, adjustData: AdjustData): Promise<ConsignmentSales>
  
  // 4. 精算処理 (SETTLED)
  settleSales(salesId: number, settleData: SettleData): Promise<ConsignmentSales>
}
```

### 精算管理コントローラー実装

#### 委託販売報告管理
```typescript
@Controller('consignments/:consignmentId/reports')
export class ConsignmentReportsController {
  constructor(
    private readonly consignmentSalesService: ConsignmentSalesService,
    private readonly consignmentsService: ConsignmentsService,
    private readonly editionsService: EditionsService,
  ) {}

  @Get()
  @Render('consignment-reports/index')
  async findAll(@Param('consignmentId', ParseIntPipe) consignmentId: number) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const salesReports = await this.consignmentSalesService.findByConsignmentId(consignmentId)
    const settlementSummary = await this.consignmentSalesService.generateSettlementReport(consignmentId)
    
    return {
      title: `${consignment.storeName} - 販売報告一覧`,
      consignment,
      salesReports,
      settlementSummary,
    }
  }

  @Get('new')
  @Render('consignment-reports/new')
  async renderNewForm(@Param('consignmentId', ParseIntPipe) consignmentId: number) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const availableEditions = await this.editionsService.findByLocation(consignment.locationId)
    
    return {
      title: `${consignment.storeName} - 新規販売報告`,
      consignment,
      availableEditions,
      formData: {},
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:consignmentId/reports')
  async create(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Body() reportSalesDto: ReportConsignmentSalesDto,
  ) {
    reportSalesDto.consignmentId = consignmentId
    await this.consignmentSalesService.reportSales(reportSalesDto)
  }

  @Get(':id')
  @Render('consignment-reports/show')
  async findOne(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const salesReport = await this.consignmentSalesService.findOneWithDetails(id)
    
    return {
      title: `販売報告詳細 - ${consignment.storeName}`,
      consignment,
      salesReport,
    }
  }

  @Post(':id/confirm')
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:consignmentId/reports/:id')
  async confirm(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDto: ConfirmConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.confirmSales(id, confirmDto)
  }

  @Post(':id/adjust')
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:consignmentId/reports/:id')
  async adjust(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() adjustDto: AdjustConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.adjustSales(id, adjustDto)
  }

  @Post(':id/settle')
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:consignmentId/reports/:id')
  async settle(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() settleDto: SettleConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.settleSales(id, settleDto)
  }
}
```

### 精算レポート表示

#### 精算ダッシュボード
```html
<!-- consignment-reports/index.ejs -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title><%= title %></title>
    <style>
        .settlement-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status-reported { background: #ffc107; color: #000; }
        .status-confirmed { background: #17a2b8; color: #fff; }
        .status-adjusted { background: #fd7e14; color: #fff; }
        .status-settled { background: #28a745; color: #fff; }
        .action-buttons { margin-top: 10px; }
        .action-buttons .btn { margin-right: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1><%= title %></h1>

        <!-- 精算サマリー -->
        <div class="settlement-summary">
            <div class="summary-card">
                <h3>総売上金額</h3>
                <p class="big-number">¥<%= settlementSummary.totalSalesAmount.toLocaleString() %></p>
                <small>手数料率: <%= consignment.commissionRate %>%</small>
            </div>
            <div class="summary-card">
                <h3>精算済み金額</h3>
                <p class="big-number">¥<%= settlementSummary.settledAmount.toLocaleString() %></p>
                <small>支払済み</small>
            </div>
            <div class="summary-card">
                <h3>未精算金額</h3>
                <p class="big-number">¥<%= settlementSummary.unsettledAmount.toLocaleString() %></p>
                <small>支払待ち</small>
            </div>
        </div>

        <!-- アクション -->
        <div class="actions">
            <a href="/consignments/<%= consignment.id %>/reports/new" class="btn btn-primary">
                📝 新規販売報告
            </a>
            <a href="/consignments/<%= consignment.id %>" class="btn btn-secondary">
                ← 委託契約詳細
            </a>
        </div>

        <!-- 販売報告一覧 -->
        <table class="table">
            <thead>
                <tr>
                    <th>報告期間</th>
                    <th>売上金額</th>
                    <th>手数料</th>
                    <th>純額</th>
                    <th>ステータス</th>
                    <th>報告日</th>
                    <th>アクション</th>
                </tr>
            </thead>
            <tbody>
                <% salesReports.forEach(report => { %>
                <tr>
                    <td>
                        <%= new Date(report.reportPeriodStart).toLocaleDateString('ja-JP') %> 〜<br>
                        <%= new Date(report.reportPeriodEnd).toLocaleDateString('ja-JP') %>
                    </td>
                    <td>¥<%= report.totalSalesAmount.toLocaleString() %></td>
                    <td>¥<%= report.commissionAmount.toLocaleString() %></td>
                    <td>¥<%= report.netAmount.toLocaleString() %></td>
                    <td>
                        <span class="status-badge status-<%= report.status %>">
                            <% if (report.status === 'reported') { %>報告済み<% } %>
                            <% if (report.status === 'confirmed') { %>確認済み<% } %>
                            <% if (report.status === 'adjusted') { %>調整済み<% } %>
                            <% if (report.status === 'settled') { %>精算済み<% } %>
                        </span>
                    </td>
                    <td><%= new Date(report.reportedAt).toLocaleDateString('ja-JP') %></td>
                    <td>
                        <div class="action-buttons">
                            <a href="/consignments/<%= consignment.id %>/reports/<%= report.id %>" class="btn btn-sm btn-info">
                                詳細
                            </a>
                            <% if (report.status === 'reported') { %>
                                <button class="btn btn-sm btn-success" onclick="confirmSales(<%= report.id %>)">
                                    確認
                                </button>
                            <% } %>
                            <% if (['confirmed', 'adjusted'].includes(report.status)) { %>
                                <button class="btn btn-sm btn-warning" onclick="adjustSales(<%= report.id %>)">
                                    調整
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="settleSales(<%= report.id %>)">
                                    精算
                                </button>
                            <% } %>
                        </div>
                    </td>
                </tr>
                <% }) %>
            </tbody>
        </table>
    </div>

    <script>
        function confirmSales(reportId) {
            const notes = prompt('確認コメントを入力してください（任意）:')
            if (notes !== null) {
                const form = document.createElement('form')
                form.method = 'POST'
                form.action = `/consignments/<%= consignment.id %>/reports/${reportId}/confirm`
                
                const notesInput = document.createElement('input')
                notesInput.type = 'hidden'
                notesInput.name = 'notes'
                notesInput.value = notes
                form.appendChild(notesInput)
                
                document.body.appendChild(form)
                form.submit()
            }
        }

        function adjustSales(reportId) {
            const reason = prompt('調整理由を入力してください:')
            if (reason) {
                const adjustedAmount = prompt('調整後金額を入力してください（空白の場合は金額変更なし）:')
                
                const form = document.createElement('form')
                form.method = 'POST'
                form.action = `/consignments/<%= consignment.id %>/reports/${reportId}/adjust`
                
                const reasonInput = document.createElement('input')
                reasonInput.type = 'hidden'
                reasonInput.name = 'adjustmentReason'
                reasonInput.value = reason
                form.appendChild(reasonInput)
                
                if (adjustedAmount && !isNaN(adjustedAmount)) {
                    const amountInput = document.createElement('input')
                    amountInput.type = 'hidden'
                    amountInput.name = 'adjustedSalesAmount'
                    amountInput.value = parseInt(adjustedAmount)
                    form.appendChild(amountInput)
                }
                
                document.body.appendChild(form)
                form.submit()
            }
        }

        function settleSales(reportId) {
            const method = prompt('精算方法を入力してください（bank_transfer, cash等）:', 'bank_transfer')
            if (method) {
                const notes = prompt('精算時のコメントを入力してください（任意）:')
                
                const form = document.createElement('form')
                form.method = 'POST'
                form.action = `/consignments/<%= consignment.id %>/reports/${reportId}/settle`
                
                const methodInput = document.createElement('input')
                methodInput.type = 'hidden'
                methodInput.name = 'settlementMethod'
                methodInput.value = method
                form.appendChild(methodInput)
                
                if (notes) {
                    const notesInput = document.createElement('input')
                    notesInput.type = 'hidden'
                    notesInput.name = 'notes'
                    notesInput.value = notes
                    form.appendChild(notesInput)
                }
                
                document.body.appendChild(form)
                form.submit()
            }
        }
    </script>
</body>
</html>
```

## 🗂️ Phase 5-4: 委託在庫管理・統合テスト（1-2日）

### 委託在庫管理機能

#### 委託先在庫状況表示
```typescript
@Get('consignments/:id/stock')
@Render('consignments/stock')
async getConsignmentStock(@Param('id', ParseIntPipe) id: number) {
  const consignment = await this.consignmentsService.findOne(id)
  const stockStatus = await this.stocksService.findByLocation(consignment.locationId)
  const stockMovements = await this.stockMovementsService.findByLocation(consignment.locationId)
  
  return {
    title: `${consignment.storeName} - 在庫状況`,
    consignment,
    stockStatus,
    stockMovements,
  }
}
```

### 統合テスト実装

#### 委託販売統合テスト
```typescript
describe('Consignment Management Integration Tests', () => {
  let testConsignment: Consignment
  let testEdition: Edition
  let testLocation: StorageLocation

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
    
    // テストデータ作成
    testLocation = await createTestStorageLocation({ type: 'consignment' })
    testConsignment = await createTestConsignment({ locationId: testLocation.id })
    const testBook = await createTestBook()
    testEdition = await createTestEdition(testBook.id)
    
    // 委託先初期在庫設定
    await createTestStock({
      editionId: testEdition.id,
      locationId: testLocation.id,
      quantity: 50,
      availableQuantity: 50,
    })
  })

  it('should create consignment sales report and update stock', async () => {
    const reportData = {
      consignmentId: testConsignment.id,
      reportPeriodStart: '2025-01-01',
      reportPeriodEnd: '2025-01-31',
      totalSalesAmount: 5000,
      details: [{
        editionId: testEdition.id,
        quantity: 5,
        unitPrice: 1000,
      }]
    }

    const response = await request(app.getHttpServer())
      .post(`/consignments/${testConsignment.id}/reports`)
      .send(reportData)
      .expect(302)

    // 委託先在庫確認
    const updatedStock = await stocksService.findByEditionAndLocation(
      testEdition.id, 
      testLocation.id
    )
    expect(updatedStock.quantity).toBe(45) // 50 - 5
    expect(updatedStock.availableQuantity).toBe(45)

    // 委託販売レポート確認
    const salesReports = await consignmentSalesService.findByConsignmentId(testConsignment.id)
    expect(salesReports).toHaveLength(1)
    expect(salesReports[0].totalSalesAmount).toBe(5000)
    expect(salesReports[0].status).toBe('reported')
  })

  it('should complete settlement workflow', async () => {
    // 1. 販売報告作成
    const salesReport = await createTestConsignmentSalesReport({
      consignmentId: testConsignment.id,
      totalSalesAmount: 5000,
    })

    // 2. 確認処理
    await request(app.getHttpServer())
      .post(`/consignments/${testConsignment.id}/reports/${salesReport.id}/confirm`)
      .send({ notes: '内容確認済み' })
      .expect(302)

    // 3. 精算処理
    await request(app.getHttpServer())
      .post(`/consignments/${testConsignment.id}/reports/${salesReport.id}/settle`)
      .send({ 
        settlementMethod: 'bank_transfer',
        notes: '銀行振込にて精算完了'
      })
      .expect(302)

    // ステータス確認
    const updatedReport = await consignmentSalesService.findOne(salesReport.id)
    expect(updatedReport.status).toBe('settled')
    expect(updatedReport.settledAt).toBeDefined()
  })

  it('should generate accurate settlement report', async () => {
    // 複数の委託販売報告を作成
    await createMultipleConsignmentSalesReports(testConsignment.id)

    const settlementReport = await consignmentSalesService.generateSettlementReport(
      testConsignment.id
    )

    expect(settlementReport.totalReports).toBeGreaterThan(0)
    expect(settlementReport.totalSalesAmount).toBeGreaterThan(0)
    expect(settlementReport.totalCommissionAmount).toBeGreaterThan(0)
    expect(settlementReport.totalNetAmount).toBeGreaterThan(0)
  })

  it('should prevent deletion of consignment with unsettled sales', async () => {
    // 未精算の販売報告作成
    await createTestConsignmentSalesReport({
      consignmentId: testConsignment.id,
      status: 'confirmed', // 未精算
    })

    const response = await request(app.getHttpServer())
      .delete(`/consignments/${testConsignment.id}`)
      .expect(400)

    expect(response.text).toContain('未精算の販売報告があるため削除できません')
  })
})
```

## 📊 Phase 5 完了条件

### 技術的検証
- **全統合テスト通過**: 委託契約・販売報告・精算処理の全機能テスト成功
- **ワークフロー確認**: 報告→確認→調整→精算の一連の処理正常動作
- **在庫連携確認**: 委託販売時の在庫減少・移動記録の正常動作
- **型チェック**: TypeScriptエラー0件

### 機能検証
- **委託契約管理**: 契約の作成・編集・削除・状況確認の正常動作
- **販売報告システム**: 委託先からの販売報告記録・状況管理
- **精算処理**: 手数料計算・調整・支払処理の正確な実行
- **委託在庫管理**: 委託先在庫の正確な管理・移動履歴

### 業務フロー検証
- **委託契約締結**: 新規委託先との契約締結プロセス
- **在庫預託**: 委託先への在庫移動・記録
- **販売報告**: 委託先からの定期的な販売報告受理
- **精算処理**: 手数料控除・支払処理の完了

## 🎯 Phase 5完了時の期待効果

### 機能面
- **包括的委託管理**: 契約から精算まで一貫した委託販売管理
- **自動計算機能**: 手数料・純額の自動計算・調整機能
- **ワークフロー管理**: 段階的な承認・処理プロセス
- **詳細な記録管理**: 全委託取引の完全な記録・追跡

### 業務効率面
- **業務自動化**: 手作業による計算・記録作業の削減
- **ミス防止**: 自動計算による計算ミス・記録漏れの防止
- **状況可視化**: 委託先別・期間別の売上状況の一元把握
- **精算効率化**: 迅速で正確な精算処理の実現

### 経営管理面
- **収益分析**: 委託先別・版別の詳細な収益分析
- **契約管理**: 委託条件・手数料率の適切な管理
- **キャッシュフロー**: 委託売上の正確な把握・予測
- **パートナー管理**: 委託先との良好な関係構築支援

---

**実装予定時期**: Phase 4完了後  
**最終更新**: 2025年6月28日  
**次回更新予定**: Phase 5実装開始時