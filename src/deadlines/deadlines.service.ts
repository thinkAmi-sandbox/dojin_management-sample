import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { type Book, type Deadline, books, deadlines } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateDeadlineDto } from './dto/create-deadline.dto'

@Injectable()
export class DeadlinesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAllByBookId(bookId: number): Promise<Deadline[]> {
    // 書籍が存在するか確認
    const [book] = await this.drizzle.db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1)

    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`)
    }

    // 締切一覧を取得
    return this.drizzle.db
      .select()
      .from(deadlines)
      .where(eq(deadlines.bookId, bookId))
      .orderBy(deadlines.dueDate)
  }

  async findBook(bookId: number): Promise<Book> {
    const [book] = await this.drizzle.db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1)

    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`)
    }

    return book
  }

  async create(
    bookId: number,
    createDeadlineDto: CreateDeadlineDto,
  ): Promise<Deadline> {
    // 書籍が存在するか確認
    const book = await this.findBook(bookId)

    const [deadline] = await this.drizzle.db
      .insert(deadlines)
      .values({
        bookId,
        title: createDeadlineDto.title,
        dueDate: new Date(createDeadlineDto.dueDate),
        description: createDeadlineDto.description,
      })
      .returning()

    return deadline
  }
}
