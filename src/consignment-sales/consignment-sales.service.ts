import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, between, desc, eq, gte, lte, ne, sql } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import type { AdjustConsignmentSalesDto } from './dto/adjust-consignment-sales.dto'
import type { ConfirmConsignmentSalesDto } from './dto/confirm-consignment-sales.dto'
import type {
  ConsignmentSalesDetailDto,
  CreateConsignmentSalesDto,
} from './dto/create-consignment-sales.dto'
import type { SettleConsignmentSalesDto } from './dto/settle-consignment-sales.dto'

export interface ConsignmentSalesWithDetails extends schema.ConsignmentSales {
  details?: schema.ConsignmentSalesDetail[]
}

export interface SettlementReport {
  totalReports: number
  totalSalesAmount: number
  totalCommissionAmount: number
  totalNetAmount: number
  settledAmount: number
  unsettledAmount: number
}

export interface MonthlySummary {
  totalSales: number
  totalCommission: number
  netAmount: number
  reportCount: number
}

export interface QuarterlySummary {
  quarter: number
  year: number
  months: {
    month: number
    totalSales: number
    totalCommission: number
    netAmount: number
    reportCount: number
  }[]
  totalSales: number
  totalCommission: number
  netAmount: number
}

@Injectable()
export class ConsignmentSalesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async reportSales(
    reportSalesDto: CreateConsignmentSalesDto,
  ): Promise<schema.ConsignmentSales> {
    if (!reportSalesDto.consignmentId) {
      throw new BadRequestException('委託契約IDが指定されていません')
    }

    const consignmentId = reportSalesDto.consignmentId

    return await this.drizzleService.db.transaction(async (tx) => {
      // 1. 委託契約情報を取得
      const [consignment] = await tx
        .select()
        .from(schema.consignments)
        .where(eq(schema.consignments.id, consignmentId))
        .limit(1)

      if (!consignment) {
        throw new NotFoundException('委託契約が見つかりません')
      }

      // 2. 手数料・純額計算
      const commissionAmount = Math.floor(
        (reportSalesDto.totalSalesAmount * consignment.commissionRate) / 100,
      )
      const netAmount = reportSalesDto.totalSalesAmount - commissionAmount

      // 3. 委託販売レポート作成
      const [salesReport] = await tx
        .insert(schema.consignmentSales)
        .values({
          consignmentId: consignmentId,
          reportPeriodStart: new Date(reportSalesDto.reportPeriodStart),
          reportPeriodEnd: new Date(reportSalesDto.reportPeriodEnd),
          totalSalesAmount: reportSalesDto.totalSalesAmount,
          commissionAmount,
          netAmount,
          status: 'reported',
          notes: reportSalesDto.notes,
        })
        .returning()

      // 4. 販売明細作成
      if (reportSalesDto.details && reportSalesDto.details.length > 0) {
        for (const detail of reportSalesDto.details) {
          await tx.insert(schema.consignmentSalesDetails).values({
            consignmentSalesId: salesReport.id,
            editionId: detail.editionId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            subtotal: detail.quantity * detail.unitPrice,
          })

          // 5. 委託先在庫から減少
          await this.updateConsignmentStock(
            tx,
            detail.editionId,
            consignment.locationId,
            detail.quantity,
          )

          // 6. 在庫移動履歴記録
          await tx.insert(schema.stockMovements).values({
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
      }

      return salesReport
    })
  }

  async confirmSales(
    salesId: number,
    confirmDto: ConfirmConsignmentSalesDto,
  ): Promise<schema.ConsignmentSales> {
    const salesReport = await this.findOne(salesId)

    if (salesReport.status !== 'reported') {
      throw new BadRequestException('報告済み状態の販売報告のみ確認できます')
    }

    const [confirmedSales] = await this.drizzleService.db
      .update(schema.consignmentSales)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        notes: confirmDto.notes
          ? `${salesReport.notes || ''}\n[確認時追記] ${confirmDto.notes}`
          : salesReport.notes,
      })
      .where(eq(schema.consignmentSales.id, salesId))
      .returning()

    return confirmedSales
  }

  async adjustSales(
    salesId: number,
    adjustDto: AdjustConsignmentSalesDto,
  ): Promise<schema.ConsignmentSales> {
    const salesReport = await this.findOne(salesId)

    if (!['confirmed', 'adjusted'].includes(salesReport.status)) {
      throw new BadRequestException(
        '確認済みまたは調整済み状態の販売報告のみ調整できます',
      )
    }

    return await this.drizzleService.db.transaction(async (tx) => {
      // 金額調整の場合は手数料・純額を再計算
      let updateData: Partial<schema.NewConsignmentSales> = {
        status: 'adjusted',
        adjustedAt: new Date(),
        adjustmentReason: adjustDto.adjustmentReason,
      }

      if (adjustDto.adjustedSalesAmount !== undefined) {
        const [consignment] = await tx
          .select()
          .from(schema.consignments)
          .where(eq(schema.consignments.id, salesReport.consignmentId))
          .limit(1)

        const newCommissionAmount = Math.floor(
          (adjustDto.adjustedSalesAmount * consignment.commissionRate) / 100,
        )
        const newNetAmount = adjustDto.adjustedSalesAmount - newCommissionAmount

        updateData = {
          ...updateData,
          totalSalesAmount: adjustDto.adjustedSalesAmount,
          commissionAmount: newCommissionAmount,
          netAmount: newNetAmount,
        }
      }

      const [adjustedSales] = await tx
        .update(schema.consignmentSales)
        .set(updateData)
        .where(eq(schema.consignmentSales.id, salesId))
        .returning()

      return adjustedSales
    })
  }

  async settleSales(
    salesId: number,
    settleDto: SettleConsignmentSalesDto,
  ): Promise<schema.ConsignmentSales> {
    const salesReport = await this.findOne(salesId)

    if (!['confirmed', 'adjusted'].includes(salesReport.status)) {
      throw new BadRequestException(
        '確認済みまたは調整済み状態の販売報告のみ精算できます',
      )
    }

    const [settledSales] = await this.drizzleService.db
      .update(schema.consignmentSales)
      .set({
        status: 'settled',
        settledAt: new Date(),
        settlementMethod: settleDto.settlementMethod,
        notes: settleDto.notes
          ? `${salesReport.notes || ''}\n[精算時追記] ${settleDto.notes}`
          : salesReport.notes,
      })
      .where(eq(schema.consignmentSales.id, salesId))
      .returning()

    return settledSales
  }

  async findOne(id: number): Promise<schema.ConsignmentSales> {
    const result = await this.drizzleService.db
      .select()
      .from(schema.consignmentSales)
      .where(eq(schema.consignmentSales.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('委託販売報告が見つかりません')
    }

    return result[0]
  }

  async findOneWithDetails(id: number): Promise<ConsignmentSalesWithDetails> {
    const salesReport = await this.findOne(id)

    const details = await this.drizzleService.db
      .select({
        id: schema.consignmentSalesDetails.id,
        consignmentSalesId: schema.consignmentSalesDetails.consignmentSalesId,
        editionId: schema.consignmentSalesDetails.editionId,
        quantity: schema.consignmentSalesDetails.quantity,
        unitPrice: schema.consignmentSalesDetails.unitPrice,
        subtotal: schema.consignmentSalesDetails.subtotal,
        createdAt: schema.consignmentSalesDetails.createdAt,
        // 版情報も含める
        editionName: schema.editions.versionName,
        bookTitle: schema.books.title,
      })
      .from(schema.consignmentSalesDetails)
      .innerJoin(
        schema.editions,
        eq(schema.consignmentSalesDetails.editionId, schema.editions.id),
      )
      .innerJoin(schema.books, eq(schema.editions.bookId, schema.books.id))
      .where(eq(schema.consignmentSalesDetails.consignmentSalesId, id))
      .orderBy(schema.consignmentSalesDetails.id)

    return {
      ...salesReport,
      details: details as schema.ConsignmentSalesDetail[],
    }
  }

  async findByConsignmentId(
    consignmentId: number,
  ): Promise<schema.ConsignmentSales[]> {
    return await this.drizzleService.db
      .select()
      .from(schema.consignmentSales)
      .where(eq(schema.consignmentSales.consignmentId, consignmentId))
      .orderBy(desc(schema.consignmentSales.reportPeriodEnd))
  }

  private async updateConsignmentStock(
    tx: Parameters<Parameters<typeof this.drizzleService.db.transaction>[0]>[0],
    editionId: number,
    locationId: number,
    quantity: number,
  ): Promise<void> {
    const result = await tx
      .update(schema.stocks)
      .set({
        quantity: sql`${schema.stocks.quantity} - ${quantity}`,
        availableQuantity: sql`${schema.stocks.availableQuantity} - ${quantity}`,
      })
      .where(
        and(
          eq(schema.stocks.editionId, editionId),
          eq(schema.stocks.locationId, locationId),
          gte(schema.stocks.quantity, quantity),
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new BadRequestException(
        `委託先在庫が不足しています（版ID: ${editionId}）`,
      )
    }
  }

  // 一括精算機能
  async bulkSettle(
    consignmentId: number,
    periodStart: Date,
    periodEnd: Date,
    settlementMethod: string,
    notes?: string,
  ): Promise<number> {
    return await this.drizzleService.db.transaction(async (tx) => {
      // 指定期間内の未精算レポートを取得

      const reportsToSettle = await tx
        .select()
        .from(schema.consignmentSales)
        .where(
          and(
            eq(schema.consignmentSales.consignmentId, consignmentId),
            gte(schema.consignmentSales.reportPeriodEnd, periodStart),
            lte(schema.consignmentSales.reportPeriodEnd, periodEnd),
            ne(schema.consignmentSales.status, 'settled'),
          ),
        )

      // 未確認のレポートがあるかチェック
      const unconfirmedReports = reportsToSettle.filter(
        (r) => r.status === 'reported',
      )
      if (unconfirmedReports.length > 0) {
        throw new BadRequestException(
          '未確認の販売報告があるため一括精算できません',
        )
      }

      // 一括精算実行
      for (const report of reportsToSettle) {
        await tx
          .update(schema.consignmentSales)
          .set({
            status: 'settled',
            settledAt: new Date(),
            settlementMethod,
            notes: notes
              ? `${report.notes || ''}\n[一括精算] ${notes}`
              : report.notes,
          })
          .where(eq(schema.consignmentSales.id, report.id))
      }

      return reportsToSettle.length
    })
  }

  // 月次精算サマリー取得
  async getMonthlySummary(
    consignmentId: number,
    year: number,
    month: number,
  ): Promise<MonthlySummary> {
    // dateフィールドなので、文字列形式で比較
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    const result = await this.drizzleService.db
      .select({
        totalSales: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.totalSalesAmount}), 0) AS INTEGER)`,
        totalCommission: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.commissionAmount}), 0) AS INTEGER)`,
        netAmount: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.netAmount}), 0) AS INTEGER)`,
        reportCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(schema.consignmentSales)
      .where(
        and(
          eq(schema.consignmentSales.consignmentId, consignmentId),
          gte(schema.consignmentSales.reportPeriodEnd, new Date(startDateStr)),
          lte(schema.consignmentSales.reportPeriodEnd, new Date(endDateStr)),
        ),
      )

    if (!result || result.length === 0) {
      return {
        totalSales: 0,
        totalCommission: 0,
        netAmount: 0,
        reportCount: 0,
      }
    }

    const response = {
      totalSales: result[0].totalSales || 0,
      totalCommission: result[0].totalCommission || 0,
      netAmount: result[0].netAmount || 0,
      reportCount: result[0].reportCount || 0,
    }

    return response
  }

  // 四半期別精算レポート取得
  async getQuarterlySummary(
    consignmentId: number,
    year: number,
    quarter: number,
  ): Promise<QuarterlySummary> {
    const startMonth = (quarter - 1) * 3 + 1
    const months = []

    for (let i = 0; i < 3; i++) {
      const month = startMonth + i
      const monthSummary = await this.getMonthlySummary(
        consignmentId,
        year,
        month,
      )
      months.push({
        month,
        ...monthSummary,
      })
    }

    const totalSales = months.reduce((sum, m) => sum + m.totalSales, 0)
    const totalCommission = months.reduce(
      (sum, m) => sum + m.totalCommission,
      0,
    )
    const netAmount = months.reduce((sum, m) => sum + m.netAmount, 0)

    const response = {
      quarter,
      year,
      months,
      totalSales,
      totalCommission,
      netAmount,
    }

    return response
  }

  // 精算レポート生成
  async generateSettlementReport(
    consignmentId: number,
    period?: { start: Date; end: Date },
  ): Promise<SettlementReport> {
    const whereConditions = [
      eq(schema.consignmentSales.consignmentId, consignmentId),
    ]

    if (period) {
      whereConditions.push(
        gte(schema.consignmentSales.reportPeriodEnd, period.start),
        lte(schema.consignmentSales.reportPeriodEnd, period.end),
      )
    }

    const result = await this.drizzleService.db
      .select({
        totalReports: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        totalSalesAmount: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.totalSalesAmount}), 0) AS INTEGER)`,
        totalCommissionAmount: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.commissionAmount}), 0) AS INTEGER)`,
        totalNetAmount: sql<number>`CAST(COALESCE(SUM(${schema.consignmentSales.netAmount}), 0) AS INTEGER)`,
        settledAmount: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${schema.consignmentSales.status} = 'settled' THEN ${schema.consignmentSales.netAmount} ELSE 0 END), 0) AS INTEGER)`,
        unsettledAmount: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${schema.consignmentSales.status} != 'settled' THEN ${schema.consignmentSales.netAmount} ELSE 0 END), 0) AS INTEGER)`,
      })
      .from(schema.consignmentSales)
      .where(and(...whereConditions))

    return {
      totalReports: result[0].totalReports || 0,
      totalSalesAmount: result[0].totalSalesAmount || 0,
      totalCommissionAmount: result[0].totalCommissionAmount || 0,
      totalNetAmount: result[0].totalNetAmount || 0,
      settledAmount: result[0].settledAmount || 0,
      unsettledAmount: result[0].unsettledAmount || 0,
    }
  }

  // CSVエクスポート用データ取得
  async getExportData(
    consignmentId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Record<string, unknown>[]> {
    const reports = await this.drizzleService.db
      .select({
        reportPeriodStart: schema.consignmentSales.reportPeriodStart,
        reportPeriodEnd: schema.consignmentSales.reportPeriodEnd,
        totalSalesAmount: schema.consignmentSales.totalSalesAmount,
        commissionAmount: schema.consignmentSales.commissionAmount,
        netAmount: schema.consignmentSales.netAmount,
        status: schema.consignmentSales.status,
        reportedAt: schema.consignmentSales.reportedAt,
        settledAt: schema.consignmentSales.settledAt,
        settlementMethod: schema.consignmentSales.settlementMethod,
      })
      .from(schema.consignmentSales)
      .where(
        and(
          eq(schema.consignmentSales.consignmentId, consignmentId),
          gte(schema.consignmentSales.reportPeriodEnd, periodStart),
          lte(schema.consignmentSales.reportPeriodEnd, periodEnd),
        ),
      )
      .orderBy(desc(schema.consignmentSales.reportPeriodEnd))

    const exportData = reports.map((r) => ({
      報告期間: `${r.reportPeriodStart.toISOString().split('T')[0]} 〜 ${r.reportPeriodEnd.toISOString().split('T')[0]}`,
      売上金額: r.totalSalesAmount,
      手数料: r.commissionAmount,
      純額: r.netAmount,
      ステータス: this.getStatusLabel(r.status),
      報告日: r.reportedAt?.toLocaleDateString('ja-JP'),
      精算日: r.settledAt?.toLocaleDateString('ja-JP') || '',
      精算方法: r.settlementMethod || '',
    }))

    return exportData
  }

  private getStatusLabel(
    status: 'reported' | 'confirmed' | 'adjusted' | 'settled',
  ): string {
    const statusMap = {
      reported: '報告済み',
      confirmed: '確認済み',
      adjusted: '調整済み',
      settled: '精算済み',
    }
    return statusMap[status]
  }
}
