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

  async findBook(bookId: number): Promise<schema.Book> {
    const [book] = await this.drizzleService.db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, bookId))
      .limit(1)

    if (!book) {
      throw new NotFoundException(`書籍ID ${bookId} が見つかりません`)
    }

    return book
  }

  async findExhibitBooks(exhibitId: number) {
    // 出展申込が存在するか確認
    await this.findExhibit(exhibitId)

    // 出展申込に関連付けられた書籍を取得（JOIN処理）
    const result = await this.drizzleService.db
      .select({
        exhibitId: schema.exhibitBooks.exhibitId,
        bookId: schema.exhibitBooks.bookId,
        plannedQuantity: schema.exhibitBooks.plannedQuantity,
        price: schema.exhibitBooks.price,
        displayOrder: schema.exhibitBooks.displayOrder,
        createdAt: schema.exhibitBooks.createdAt,
        updatedAt: schema.exhibitBooks.updatedAt,
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
      .innerJoin(schema.books, eq(schema.exhibitBooks.bookId, schema.books.id))
      .where(eq(schema.exhibitBooks.exhibitId, exhibitId))
      .orderBy(schema.exhibitBooks.displayOrder, schema.books.title)

    return result
  }

  async findAvailableBooks(exhibitId: number): Promise<schema.Book[]> {
    // 出展申込が存在するか確認
    await this.findExhibit(exhibitId)

    // 既に関連付けられている書籍のIDを取得
    const associatedBookIds = await this.drizzleService.db
      .select({ bookId: schema.exhibitBooks.bookId })
      .from(schema.exhibitBooks)
      .where(eq(schema.exhibitBooks.exhibitId, exhibitId))

    const excludeIds = associatedBookIds.map((row) => row.bookId)

    // まだ関連付けられていない書籍を取得
    const allBooks = await this.drizzleService.db
      .select()
      .from(schema.books)
      .orderBy(schema.books.title)

    // JavaScriptでフィルタリング（除外IDに含まれない書籍のみ）
    return allBooks.filter((book) => !excludeIds.includes(book.id))
  }

  async addBookToExhibit(
    exhibitId: number,
    createExhibitBookDto: CreateExhibitBookDto,
  ): Promise<schema.ExhibitBook> {
    const { bookId, plannedQuantity, price, displayOrder } =
      createExhibitBookDto

    // 出展申込と書籍が存在するか確認
    await this.findExhibit(exhibitId)
    await this.findBook(bookId)

    // 既に関連付けられているかチェック
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.bookId, bookId),
        ),
      )
      .limit(1)

    if (existingAssociation.length > 0) {
      throw new BadRequestException('この書籍は既に追加されています')
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

    // 関連付けを作成
    const [exhibitBook] = await this.drizzleService.db
      .insert(schema.exhibitBooks)
      .values({
        exhibitId,
        bookId,
        plannedQuantity,
        price,
        displayOrder: finalDisplayOrder,
      })
      .returning()

    return exhibitBook
  }

  async findExhibitBook(
    exhibitId: number,
    bookId: number,
  ): Promise<schema.ExhibitBook> {
    const [exhibitBook] = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.bookId, bookId),
        ),
      )
      .limit(1)

    if (!exhibitBook) {
      throw new NotFoundException(
        `出展申込ID ${exhibitId} と書籍ID ${bookId} の関連付けが見つかりません`,
      )
    }

    return exhibitBook
  }

  async updateExhibitBook(
    exhibitId: number,
    bookId: number,
    updateExhibitBookDto: UpdateExhibitBookDto,
  ): Promise<schema.ExhibitBook> {
    // 関連付けが存在するかチェック
    await this.findExhibitBook(exhibitId, bookId)

    // 更新処理
    const [updatedExhibitBook] = await this.drizzleService.db
      .update(schema.exhibitBooks)
      .set({
        ...updateExhibitBookDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.bookId, bookId),
        ),
      )
      .returning()

    return updatedExhibitBook
  }

  async removeBookFromExhibit(
    exhibitId: number,
    bookId: number,
  ): Promise<void> {
    // 出展申込と書籍が存在するか確認
    await this.findExhibit(exhibitId)
    await this.findBook(bookId)

    // 関連付けが存在するかチェック
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.bookId, bookId),
        ),
      )
      .limit(1)

    if (existingAssociation.length === 0) {
      throw new NotFoundException('頒布書籍が見つかりません')
    }

    // 関連付けを削除
    await this.drizzleService.db
      .delete(schema.exhibitBooks)
      .where(
        and(
          eq(schema.exhibitBooks.exhibitId, exhibitId),
          eq(schema.exhibitBooks.bookId, bookId),
        ),
      )
  }
}
