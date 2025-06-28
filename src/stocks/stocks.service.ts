import { Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { stocks, editions, storageLocations, books, Stock } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateStockDto } from './dto/create-stock.dto'
import { UpdateStockDto } from './dto/update-stock.dto'

// 関連情報込みの在庫型定義
export interface StockWithRelations {
  id: number
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastCheckedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  editionId: number
  editionVersionName: string
  editionBasePrice: number
  bookId: number
  bookTitle: string
  locationId: number
  locationName: string
  locationType: string
}

@Injectable()
export class StocksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(filters?: {
    editionId?: number
    locationId?: number
  }): Promise<StockWithRelations[]> {
    const query = this.drizzleService.db
      .select({
        id: stocks.id,
        quantity: stocks.quantity,
        reservedQuantity: stocks.reservedQuantity,
        availableQuantity: stocks.availableQuantity,
        lastCheckedAt: stocks.lastCheckedAt,
        notes: stocks.notes,
        createdAt: stocks.createdAt,
        updatedAt: stocks.updatedAt,
        editionId: editions.id,
        editionVersionName: editions.versionName,
        editionBasePrice: editions.basePrice,
        bookId: books.id,
        bookTitle: books.title,
        locationId: storageLocations.id,
        locationName: storageLocations.name,
        locationType: storageLocations.type,
      })
      .from(stocks)
      .innerJoin(editions, eq(stocks.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .innerJoin(storageLocations, eq(stocks.locationId, storageLocations.id))
      .orderBy(desc(stocks.createdAt))

    // フィルタリング条件の追加
    if (filters?.editionId) {
      query.where(eq(stocks.editionId, filters.editionId))
    }
    if (filters?.locationId) {
      query.where(eq(stocks.locationId, filters.locationId))
    }

    return await query
  }

  async findOne(id: number): Promise<StockWithRelations> {
    const result = await this.drizzleService.db
      .select({
        id: stocks.id,
        quantity: stocks.quantity,
        reservedQuantity: stocks.reservedQuantity,
        availableQuantity: stocks.availableQuantity,
        lastCheckedAt: stocks.lastCheckedAt,
        notes: stocks.notes,
        createdAt: stocks.createdAt,
        updatedAt: stocks.updatedAt,
        editionId: editions.id,
        editionVersionName: editions.versionName,
        editionBasePrice: editions.basePrice,
        bookId: books.id,
        bookTitle: books.title,
        locationId: storageLocations.id,
        locationName: storageLocations.name,
        locationType: storageLocations.type,
      })
      .from(stocks)
      .innerJoin(editions, eq(stocks.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .innerJoin(storageLocations, eq(stocks.locationId, storageLocations.id))
      .where(eq(stocks.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException(`在庫ID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(createStockDto: CreateStockDto): Promise<Stock> {
    // 同一版・場所の重複チェック
    const existingStock = await this.drizzleService.db
      .select()
      .from(stocks)
      .where(
        and(
          eq(stocks.editionId, createStockDto.editionId),
          eq(stocks.locationId, createStockDto.locationId),
        ),
      )
      .limit(1)

    if (existingStock.length > 0) {
      throw new Error(
        `この版と保管場所の組み合わせの在庫は既に存在します（ID: ${existingStock[0].id}）`,
      )
    }

    // 数量バランスチェック
    const quantity = createStockDto.quantity || 0
    const reservedQuantity = createStockDto.reservedQuantity || 0
    const availableQuantity = createStockDto.availableQuantity || 0

    if (quantity !== reservedQuantity + availableQuantity) {
      throw new Error(
        `在庫数量が不整合です。総数量(${quantity}) = 予約済み(${reservedQuantity}) + 販売可能(${availableQuantity})`,
      )
    }

    const result = await this.drizzleService.db
      .insert(stocks)
      .values({
        editionId: createStockDto.editionId,
        locationId: createStockDto.locationId,
        quantity,
        reservedQuantity,
        availableQuantity,
        notes: createStockDto.notes || null,
        lastCheckedAt: new Date(),
      })
      .returning()

    return result[0]
  }

  async update(id: number, updateStockDto: UpdateStockDto): Promise<Stock> {
    // 存在確認
    await this.findOne(id)

    // 数量バランスチェック（更新値が提供された場合のみ）
    if (
      updateStockDto.quantity !== undefined ||
      updateStockDto.reservedQuantity !== undefined ||
      updateStockDto.availableQuantity !== undefined
    ) {
      const currentStock = await this.drizzleService.db
        .select()
        .from(stocks)
        .where(eq(stocks.id, id))
        .limit(1)

      const current = currentStock[0]
      const quantity = updateStockDto.quantity ?? current.quantity
      const reservedQuantity =
        updateStockDto.reservedQuantity ?? current.reservedQuantity
      const availableQuantity =
        updateStockDto.availableQuantity ?? current.availableQuantity

      if (quantity !== reservedQuantity + availableQuantity) {
        throw new Error(
          `在庫数量が不整合です。総数量(${quantity}) = 予約済み(${reservedQuantity}) + 販売可能(${availableQuantity})`,
        )
      }
    }

    const result = await this.drizzleService.db
      .update(stocks)
      .set({
        quantity: updateStockDto.quantity,
        reservedQuantity: updateStockDto.reservedQuantity,
        availableQuantity: updateStockDto.availableQuantity,
        notes:
          updateStockDto.notes === undefined
            ? undefined
            : updateStockDto.notes || null,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stocks.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db.delete(stocks).where(eq(stocks.id, id))
  }

  // 特定版の在庫状況取得
  async findByEdition(editionId: number): Promise<StockWithRelations[]> {
    return await this.findAll({ editionId })
  }

  // 在庫統計情報
  async getStockSummary(): Promise<{
    totalStock: number
    totalReserved: number
    totalAvailable: number
  }> {
    const result = await this.drizzleService.db
      .select({
        totalStock: stocks.quantity,
        totalReserved: stocks.reservedQuantity,
        totalAvailable: stocks.availableQuantity,
      })
      .from(stocks)

    const summary = result.reduce(
      (acc, stock) => ({
        totalStock: acc.totalStock + stock.totalStock,
        totalReserved: acc.totalReserved + stock.totalReserved,
        totalAvailable: acc.totalAvailable + stock.totalAvailable,
      }),
      { totalStock: 0, totalReserved: 0, totalAvailable: 0 },
    )

    return summary
  }
}
