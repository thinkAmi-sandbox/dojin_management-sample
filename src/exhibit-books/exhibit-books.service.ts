import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateExhibitBookDto } from './dto/create-exhibit-book.dto'
import { UpdateExhibitBookDto } from './dto/update-exhibit-book.dto'

@Injectable()
export class ExhibitBooksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findExhibit(exhibitId: number): Promise<schema.Exhibit> {
    const [exhibit] = await this.drizzleService.db
      .select()
      .from(schema.exhibits)
      .where(eq(schema.exhibits.id, exhibitId))
      .limit(1)

    if (!exhibit) {
      throw new NotFoundException(`出展申込ID ${exhibitId} が見つかりません`)
    }

    return exhibit
  }

  async findEdition(editionId: number): Promise<schema.Edition> {
    const [edition] = await this.drizzleService.db
      .select()
      .from(schema.editions)
      .where(eq(schema.editions.id, editionId))
      .limit(1)

    if (!edition) {
      throw new NotFoundException(`版ID ${editionId} が見つかりません`)
    }

    return edition
  }

  async findExhibitBooks(exhibitId: number) {
    // 出展申込が存在するか確認
    await this.findExhibit(exhibitId)

    // 出展申込に関連付けられた版を取得（版対応JOIN処理）
    const result = await this.drizzleService.db
      .select({
        exhibitId: schema.exhibitBooks.exhibitId,
        editionId: schema.exhibitBooks.editionId,
        plannedQuantity: schema.exhibitBooks.plannedQuantity,
        actualQuantity: schema.exhibitBooks.actualQuantity,
        soldQuantity: schema.exhibitBooks.soldQuantity,
        remainingQuantity: schema.exhibitBooks.remainingQuantity,
        price: schema.exhibitBooks.price,
        displayOrder: schema.exhibitBooks.displayOrder,
        createdAt: schema.exhibitBooks.createdAt,
        updatedAt: schema.exhibitBooks.updatedAt,
        // 版情報をJOIN
        edition: {
          id: schema.editions.id,
          versionName: schema.editions.versionName,
          versionNumber: schema.editions.versionNumber,
          basePrice: schema.editions.basePrice,
          pageCount: schema.editions.pageCount,
          isActive: schema.editions.isActive,
        },
        // 書籍情報をJOIN
        book: {
          id: schema.books.id,
          title: schema.books.title,
          subtitle: schema.books.subtitle,
          description: schema.books.description,
          status: schema.books.status,
        },
      })
      .from(schema.exhibitBooks)
      .innerJoin(schema.editions, eq(schema.exhibitBooks.editionId, schema.editions.id))
      .innerJoin(schema.books, eq(schema.editions.bookId, schema.books.id))
      .where(eq(schema.exhibitBooks.exhibitId, exhibitId))
      .orderBy(schema.exhibitBooks.displayOrder, schema.books.title)

    return result
  }

  async findAvailableEditions(exhibitId: number) {
    // 出展申込が存在するか確認
    await this.findExhibit(exhibitId)

    // 既に関連付けられている版のIDを取得
    const associatedEditionIds = await this.drizzleService.db
      .select({ editionId: schema.exhibitBooks.editionId })
      .from(schema.exhibitBooks)
      .where(eq(schema.exhibitBooks.exhibitId, exhibitId))

    const excludeIds = associatedEditionIds.map((row) => row.editionId)

    // まだ関連付けられていない現行版を取得（書籍情報含む）
    const allEditions = await this.drizzleService.db
      .select({
        id: schema.editions.id,
        versionName: schema.editions.versionName,
        versionNumber: schema.editions.versionNumber,
        basePrice: schema.editions.basePrice,
        pageCount: schema.editions.pageCount,
        isActive: schema.editions.isActive,
        // 書籍情報をJOIN
        book: {
          id: schema.books.id,
          title: schema.books.title,
          subtitle: schema.books.subtitle,
          status: schema.books.status,
        },
      })
      .from(schema.editions)
      .innerJoin(schema.books, eq(schema.editions.bookId, schema.books.id))
      .where(eq(schema.editions.isActive, true)) // 現行版のみ
      .orderBy(schema.books.title, schema.editions.versionNumber)

    // JavaScriptでフィルタリング（除外IDに含まれない版のみ）
    return allEditions.filter((edition) => !excludeIds.includes(edition.id))
  }

  async addEditionToExhibit(
    exhibitId: number,
    createExhibitBookDto: CreateExhibitBookDto,
  ): Promise<schema.ExhibitBook> {
    const { 
      editionId, 
      plannedQuantity, 
      actualQuantity, 
      soldQuantity, 
      remainingQuantity, 
      price, 
      displayOrder 
    } = createExhibitBookDto

    // 出展申込と版が存在するか確認
    await this.findExhibit(exhibitId)
    await this.findEdition(editionId)

    // 既に関連付けられているかチェック（複合主キー対応）
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.editionId, editionId),
        ),
      )
      .limit(1)

    if (existingAssociation.length > 0) {
      throw new BadRequestException('この版は既に追加されています')
    }

    // 表示順序が指定されていない場合は最大値+1を設定
    let finalDisplayOrder = displayOrder || 0
    if (!displayOrder) {
      const maxOrderResult = await this.drizzleService.db
        .select({ maxOrder: schema.exhibitBooks.displayOrder })
        .from(schema.exhibitBooks)
        .where(eq(schema.exhibitBooks.exhibitId, exhibitId))
        .orderBy(schema.exhibitBooks.displayOrder)

      if (maxOrderResult.length > 0) {
        const maxOrder = Math.max(...maxOrderResult.map((r) => r.maxOrder || 0))
        finalDisplayOrder = maxOrder + 1
      }
    }

    // 関連付けを作成（版対応）
    const [exhibitBook] = await this.drizzleService.db
      .insert(schema.exhibitBooks)
      .values({
        exhibitId,
        editionId,
        plannedQuantity,
        actualQuantity,
        soldQuantity,
        remainingQuantity,
        price,
        displayOrder: finalDisplayOrder,
      })
      .returning()

    return exhibitBook
  }

  async findExhibitBook(
    exhibitId: number,
    editionId: number,
  ): Promise<schema.ExhibitBook> {
    const [exhibitBook] = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.editionId, editionId),
        ),
      )
      .limit(1)

    if (!exhibitBook) {
      throw new NotFoundException(
        `出展申込ID ${exhibitId} と版ID ${editionId} の関連付けが見つかりません`,
      )
    }

    return exhibitBook
  }

  async updateExhibitBook(
    exhibitId: number,
    editionId: number,
    updateExhibitBookDto: UpdateExhibitBookDto,
  ): Promise<schema.ExhibitBook> {
    // 関連付けが存在するかチェック（版対応）
    await this.findExhibitBook(exhibitId, editionId)

    // 更新処理（複合主キー対応）
    const [updatedExhibitBook] = await this.drizzleService.db
      .update(schema.exhibitBooks)
      .set({
        ...updateExhibitBookDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.editionId, editionId),
        ),
      )
      .returning()

    return updatedExhibitBook
  }

  async removeEditionFromExhibit(
    exhibitId: number,
    editionId: number,
  ): Promise<void> {
    // 出展申込と版が存在するか確認
    await this.findExhibit(exhibitId)
    await this.findEdition(editionId)

    // 関連付けが存在するかチェック（複合主キー対応）
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.editionId, editionId),
        ),
      )
      .limit(1)

    if (existingAssociation.length === 0) {
      throw new NotFoundException('頒布版が見つかりません')
    }

    // 関連付けを削除（複合主キー対応）
    await this.drizzleService.db
      .delete(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.editionId, editionId),
        ),
      )
  }
}
