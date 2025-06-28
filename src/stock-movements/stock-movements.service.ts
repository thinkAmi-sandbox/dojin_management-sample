import { Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import {
  StockMovement,
  books,
  editions,
  stockMovements,
  storageLocations,
} from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateStockMovementDto } from './dto/create-stock-movement.dto'

// 関連情報込みの在庫移動型定義
export interface StockMovementWithRelations {
  id: number
  quantity: number
  movementType: string
  reason: string | null
  movedAt: Date
  createdBy: string | null
  createdAt: Date
  editionId: number
  editionVersionName: string
  editionBasePrice: number
  bookId: number
  bookTitle: string
  fromLocationId: number | null
  fromLocationName: string | null
  toLocationId: number | null
  toLocationName: string | null
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(filters?: {
    editionId?: number
    movementType?: string
    fromLocationId?: number
    toLocationId?: number
  }): Promise<StockMovementWithRelations[]> {
    // 基本的なJOINを使ってデータを取得（aliasは後で必要に応じて対応）
    const query = this.drizzleService.db
      .select({
        id: stockMovements.id,
        quantity: stockMovements.quantity,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        movedAt: stockMovements.movedAt,
        createdBy: stockMovements.createdBy,
        createdAt: stockMovements.createdAt,
        editionId: editions.id,
        editionVersionName: editions.versionName,
        editionBasePrice: editions.basePrice,
        bookId: books.id,
        bookTitle: books.title,
        fromLocationId: stockMovements.fromLocationId,
        toLocationId: stockMovements.toLocationId,
      })
      .from(stockMovements)
      .innerJoin(editions, eq(stockMovements.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .orderBy(desc(stockMovements.movedAt))

    // フィルタ条件の適用
    const conditions: any[] = []

    if (filters?.editionId) {
      conditions.push(eq(stockMovements.editionId, filters.editionId))
    }

    if (filters?.movementType) {
      conditions.push(
        eq(stockMovements.movementType, filters.movementType as any),
      )
    }

    if (filters?.fromLocationId) {
      conditions.push(eq(stockMovements.fromLocationId, filters.fromLocationId))
    }

    if (filters?.toLocationId) {
      conditions.push(eq(stockMovements.toLocationId, filters.toLocationId))
    }

    if (conditions.length > 0) {
      query.where(and(...conditions))
    }

    const results = await query

    // 保管場所情報を後で取得して結合
    const enrichedResults: StockMovementWithRelations[] = []

    for (const result of results) {
      const fromLocationName = await this.getLocationName(result.fromLocationId)
      const toLocationName = await this.getLocationName(result.toLocationId)

      enrichedResults.push({
        ...result,
        fromLocationName,
        toLocationName,
      })
    }

    return enrichedResults
  }

  async findOne(id: number): Promise<StockMovementWithRelations> {
    const result = await this.drizzleService.db
      .select({
        id: stockMovements.id,
        quantity: stockMovements.quantity,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        movedAt: stockMovements.movedAt,
        createdBy: stockMovements.createdBy,
        createdAt: stockMovements.createdAt,
        editionId: editions.id,
        editionVersionName: editions.versionName,
        editionBasePrice: editions.basePrice,
        bookId: books.id,
        bookTitle: books.title,
        fromLocationId: stockMovements.fromLocationId,
        toLocationId: stockMovements.toLocationId,
      })
      .from(stockMovements)
      .innerJoin(editions, eq(stockMovements.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(eq(stockMovements.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('在庫移動記録が見つかりません')
    }

    const movement = result[0]
    const fromLocationName = await this.getLocationName(movement.fromLocationId)
    const toLocationName = await this.getLocationName(movement.toLocationId)

    return {
      ...movement,
      fromLocationName,
      toLocationName,
    }
  }

  async create(
    createStockMovementDto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    const result = await this.drizzleService.db
      .insert(stockMovements)
      .values({
        editionId: createStockMovementDto.editionId,
        fromLocationId: createStockMovementDto.fromLocationId || null,
        toLocationId: createStockMovementDto.toLocationId || null,
        quantity: createStockMovementDto.quantity,
        movementType: createStockMovementDto.movementType,
        reason: createStockMovementDto.reason,
        movedAt: new Date(),
        createdBy: createStockMovementDto.createdBy || null,
      })
      .returning()

    return result[0]
  }

  // 保管場所情報を取得するヘルパーメソッド
  private async getLocationName(
    locationId: number | null,
  ): Promise<string | null> {
    if (!locationId) return null

    const result = await this.drizzleService.db
      .select({ name: storageLocations.name })
      .from(storageLocations)
      .where(eq(storageLocations.id, locationId))
      .limit(1)

    return result.length > 0 ? result[0].name : null
  }

  async findByEdition(
    editionId: number,
  ): Promise<StockMovementWithRelations[]> {
    return this.findAll({ editionId })
  }
}
