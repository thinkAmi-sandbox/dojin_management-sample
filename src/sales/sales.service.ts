import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { DrizzleService } from '../drizzle/drizzle.service'
import {
  salesDetails,
  salesTransactions,
  stocks,
  stockMovements,
  events,
  storageLocations,
} from '../db/schema'

@Injectable()
export class SalesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async createSalesTransaction(createSalesTransactionDto: any) {
    return await this.drizzleService.db.transaction(async (tx) => {
      // 1. 販売取引レコード作成
      const [transaction] = await tx
        .insert(salesTransactions)
        .values({
          transactionType: createSalesTransactionDto.transactionType,
          eventId: createSalesTransactionDto.eventId,
          locationId: createSalesTransactionDto.locationId,
          customerName: createSalesTransactionDto.customerName,
          customerEmail: createSalesTransactionDto.customerEmail,
          totalAmount: createSalesTransactionDto.totalAmount,
          discountAmount: createSalesTransactionDto.discountAmount || 0,
          finalAmount: createSalesTransactionDto.finalAmount,
          paymentMethod: createSalesTransactionDto.paymentMethod,
          notes: createSalesTransactionDto.notes,
        })
        .returning()

      // 2. 販売明細レコード作成
      if (createSalesTransactionDto.details) {
        for (const detail of createSalesTransactionDto.details) {
          await tx.insert(salesDetails).values({
            transactionId: transaction.id,
            editionId: detail.editionId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            discountAmount: detail.discountAmount || 0,
            subtotal:
              detail.quantity * detail.unitPrice - (detail.discountAmount || 0),
          })

          // 3. 在庫減少処理・移動履歴は今後実装予定
          // TODO: 在庫連携機能の実装
          // - 在庫減少処理
          // - 在庫移動履歴記録
        }
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
    const result = await tx
      .update(stocks)
      .set({
        quantity: sql`${stocks.quantity} - ${quantity}`,
        availableQuantity: sql`${stocks.availableQuantity} - ${quantity}`,
      })
      .where(
        and(
          eq(stocks.editionId, editionId),
          eq(stocks.locationId, locationId),
          gte(stocks.availableQuantity, quantity), // 在庫不足チェック
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new BadRequestException('在庫が不足しています')
    }
  }

  async findAllSalesTransactions(filters?: any) {
    // ベースクエリを構築
    const baseQuery = this.drizzleService.db
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
      .leftJoin(
        storageLocations,
        eq(salesTransactions.locationId, storageLocations.id),
      )
      .orderBy(desc(salesTransactions.transactionDate))

    // フィルタリング条件がない場合はそのまま返す
    if (!filters || Object.keys(filters).length === 0) {
      return await baseQuery
    }

    // フィルタリング条件を構築
    const conditions = []

    if (filters.startDate && filters.endDate) {
      conditions.push(
        and(
          gte(salesTransactions.transactionDate, new Date(filters.startDate)),
          lte(salesTransactions.transactionDate, new Date(filters.endDate)),
        ),
      )
    }

    if (filters.transactionType) {
      conditions.push(
        eq(salesTransactions.transactionType, filters.transactionType),
      )
    }

    // 条件がある場合はwhereを適用
    if (conditions.length > 0) {
      return await this.drizzleService.db
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
        .leftJoin(
          storageLocations,
          eq(salesTransactions.locationId, storageLocations.id),
        )
        .where(and(...conditions))
        .orderBy(desc(salesTransactions.transactionDate))
    }

    return await baseQuery
  }

  async findOneWithDetails(id: number) {
    const result = await this.drizzleService.db
      .select({
        // SalesTransaction fields
        id: salesTransactions.id,
        transactionType: salesTransactions.transactionType,
        eventId: salesTransactions.eventId,
        locationId: salesTransactions.locationId,
        customerName: salesTransactions.customerName,
        customerEmail: salesTransactions.customerEmail,
        totalAmount: salesTransactions.totalAmount,
        discountAmount: salesTransactions.discountAmount,
        finalAmount: salesTransactions.finalAmount,
        paymentMethod: salesTransactions.paymentMethod,
        transactionDate: salesTransactions.transactionDate,
        notes: salesTransactions.notes,
        createdAt: salesTransactions.createdAt,
        updatedAt: salesTransactions.updatedAt,
        // Related fields
        eventName: events.name,
        locationName: storageLocations.name,
      })
      .from(salesTransactions)
      .leftJoin(events, eq(salesTransactions.eventId, events.id))
      .leftJoin(
        storageLocations,
        eq(salesTransactions.locationId, storageLocations.id),
      )
      .where(eq(salesTransactions.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('販売記録が見つかりません')
    }

    // 販売明細も取得
    const details = await this.drizzleService.db
      .select()
      .from(salesDetails)
      .where(eq(salesDetails.transactionId, id))

    return {
      ...result[0],
      details,
    }
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOneWithDetails(id)

    await this.drizzleService.db
      .delete(salesTransactions)
      .where(eq(salesTransactions.id, id))
  }
}