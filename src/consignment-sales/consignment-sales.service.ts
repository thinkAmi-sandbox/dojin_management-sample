import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
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
}
