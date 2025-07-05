import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import {
  events,
  books,
  editions,
  salesDetails,
  salesTransactions,
  stockMovements,
  stocks,
  storageLocations,
} from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import type {
  CreateSalesTransactionDto,
  UpdateSalesTransactionDto,
} from './dto'

@Injectable()
export class SalesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async createSalesTransaction(
    createSalesTransactionDto: CreateSalesTransactionDto,
  ) {
    return await this.drizzleService.db.transaction(async (tx) => {
      // 委託販売の場合のバリデーション
      if (
        createSalesTransactionDto.transactionType === 'consignment' &&
        createSalesTransactionDto.locationId
      ) {
        const [location] = await tx
          .select()
          .from(storageLocations)
          .where(eq(storageLocations.id, createSalesTransactionDto.locationId))
          .limit(1)

        if (!location) {
          throw new NotFoundException('保管場所が見つかりません')
        }

        if (!location.isConsignment) {
          throw new BadRequestException(
            '委託販売は委託先保管場所でのみ可能です',
          )
        }
      }

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

          // 3. 在庫減少処理
          if (createSalesTransactionDto.locationId) {
            await this.updateStockForSale(
              tx,
              detail.editionId,
              createSalesTransactionDto.locationId,
              detail.quantity,
            )

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
        }
      }

      return transaction
    })
  }

  private async updateStockForSale(
    tx: Parameters<Parameters<DrizzleService['db']['transaction']>[0]>[0],
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

  async findAllSalesTransactions(filters?: {
    startDate?: string
    endDate?: string
    transactionType?: 'event' | 'consignment' | 'online' | 'direct'
  }) {
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

    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        and(
          gte(salesTransactions.transactionDate, new Date(filters.startDate)),
          lte(salesTransactions.transactionDate, new Date(filters.endDate)),
        ),
      )
    }

    if (filters?.transactionType) {
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

    // 販売明細も取得（書籍・版情報含む）
    const details = await this.drizzleService.db
      .select({
        id: salesDetails.id,
        transactionId: salesDetails.transactionId,
        editionId: salesDetails.editionId,
        quantity: salesDetails.quantity,
        unitPrice: salesDetails.unitPrice,
        discountAmount: salesDetails.discountAmount,
        subtotal: salesDetails.subtotal,
        notes: salesDetails.notes,
        createdAt: salesDetails.createdAt,
        // Edition info
        editionVersionName: editions.versionName,
        // Book info
        bookTitle: books.title,
      })
      .from(salesDetails)
      .innerJoin(editions, eq(salesDetails.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(eq(salesDetails.transactionId, id))

    return {
      ...result[0],
      details,
    }
  }

  async update(
    id: number,
    updateSalesTransactionDto: UpdateSalesTransactionDto,
  ): Promise<void> {
    // 存在確認
    await this.findOneWithDetails(id)

    // 基本情報のみ更新（詳細は別途実装予定）
    await this.drizzleService.db
      .update(salesTransactions)
      .set({
        customerName: updateSalesTransactionDto.customerName,
        customerEmail: updateSalesTransactionDto.customerEmail,
        paymentMethod: updateSalesTransactionDto.paymentMethod,
        notes: updateSalesTransactionDto.notes,
      })
      .where(eq(salesTransactions.id, id))
  }

  async remove(id: number): Promise<void> {
    // 存在確認と明細取得
    const transaction = await this.findOneWithDetails(id)

    await this.drizzleService.db.transaction(async (tx) => {
      // 販売明細から在庫を復元
      if (transaction.details && transaction.details.length > 0) {
        for (const detail of transaction.details) {
          // 在庫を復元
          if (transaction.locationId) {
            await tx
              .update(stocks)
              .set({
                quantity: sql`${stocks.quantity} + ${detail.quantity}`,
                availableQuantity: sql`${stocks.availableQuantity} + ${detail.quantity}`,
              })
              .where(
                and(
                  eq(stocks.editionId, detail.editionId),
                  eq(stocks.locationId, transaction.locationId),
                ),
              )

            // 返品履歴を記録
            await tx.insert(stockMovements).values({
              editionId: detail.editionId,
              fromLocationId: null,
              toLocationId: transaction.locationId,
              quantity: detail.quantity,
              movementType: 'return',
              referenceType: 'sale',
              referenceId: transaction.id,
              reason: `販売取引削除による返品 - 取引ID: ${transaction.id}`,
            })
          }
        }
      }

      // 販売取引を削除（カスケードで明細も削除される）
      await tx.delete(salesTransactions).where(eq(salesTransactions.id, id))
    })
  }
}
