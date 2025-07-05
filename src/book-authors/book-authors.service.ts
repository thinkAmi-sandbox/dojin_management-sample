import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { AddAuthorToBookDto } from './dto/add-author-to-book.dto'

@Injectable()
export class BookAuthorsService {
  constructor(private readonly drizzleService: DrizzleService) {}

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

  async findAuthor(authorId: number): Promise<schema.Author> {
    const [author] = await this.drizzleService.db
      .select()
      .from(schema.authors)
      .where(eq(schema.authors.id, authorId))
      .limit(1)

    if (!author) {
      throw new NotFoundException(`執筆者ID ${authorId} が見つかりません`)
    }

    return author
  }

  async findBookAuthors(bookId: number): Promise<schema.Author[]> {
    // 書籍が存在するか確認
    await this.findBook(bookId)

    // 書籍に関連付けられた執筆者を取得
    const result = await this.drizzleService.db
      .select({
        id: schema.authors.id,
        name: schema.authors.name,
        email: schema.authors.email,
        bio: schema.authors.bio,
        createdAt: schema.authors.createdAt,
        updatedAt: schema.authors.updatedAt,
      })
      .from(schema.bookAuthors)
      .innerJoin(
        schema.authors,
        eq(schema.bookAuthors.authorId, schema.authors.id),
      )
      .where(eq(schema.bookAuthors.bookId, bookId))
      .orderBy(schema.authors.name)

    return result
  }

  async findAvailableAuthors(bookId: number): Promise<schema.Author[]> {
    // 書籍が存在するか確認
    await this.findBook(bookId)

    // 既に関連付けられている執筆者のIDを取得
    const associatedAuthorIds = await this.drizzleService.db
      .select({ authorId: schema.bookAuthors.authorId })
      .from(schema.bookAuthors)
      .where(eq(schema.bookAuthors.bookId, bookId))

    const excludeIds = associatedAuthorIds.map((row) => row.authorId)

    // まだ関連付けられていない執筆者を取得
    const allAuthors = await this.drizzleService.db
      .select()
      .from(schema.authors)
      .orderBy(schema.authors.name)

    // JavaScriptでフィルタリング（除外IDに含まれない執筆者のみ）
    return allAuthors.filter((author) => !excludeIds.includes(author.id))
  }

  async addAuthorToBook(
    bookId: number,
    addAuthorToBookDto: AddAuthorToBookDto,
  ): Promise<schema.BookAuthor> {
    const { authorId } = addAuthorToBookDto

    // 書籍と執筆者が存在するか確認
    await this.findBook(bookId)
    await this.findAuthor(authorId)

    // 既に関連付けられているかチェック
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.bookAuthors)
      .where(
        and(
          eq(schema.bookAuthors.bookId, bookId),
          eq(schema.bookAuthors.authorId, authorId),
        ),
      )
      .limit(1)

    if (existingAssociation.length > 0) {
      throw new BadRequestException(
        'この執筆者は既にこの書籍に関連付けられています',
      )
    }

    // 関連付けを作成
    const [bookAuthor] = await this.drizzleService.db
      .insert(schema.bookAuthors)
      .values({
        bookId,
        authorId,
      })
      .returning()

    return bookAuthor
  }

  async removeAuthorFromBook(bookId: number, authorId: number): Promise<void> {
    // 書籍と執筆者が存在するか確認
    await this.findBook(bookId)
    await this.findAuthor(authorId)

    // 関連付けが存在するかチェック
    const existingAssociation = await this.drizzleService.db
      .select()
      .from(schema.bookAuthors)
      .where(
        and(
          eq(schema.bookAuthors.bookId, bookId),
          eq(schema.bookAuthors.authorId, authorId),
        ),
      )
      .limit(1)

    if (existingAssociation.length === 0) {
      throw new NotFoundException(
        `書籍ID ${bookId} と執筆者ID ${authorId} の関連付けが見つかりません`,
      )
    }

    // 関連付けを削除
    await this.drizzleService.db
      .delete(schema.bookAuthors)
      .where(
        and(
          eq(schema.bookAuthors.bookId, bookId),
          eq(schema.bookAuthors.authorId, authorId),
        ),
      )
  }
}
