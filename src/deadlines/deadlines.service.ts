import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { type Book, type Deadline, books, deadlines } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateDeadlineDto } from './dto/create-deadline.dto'
import { UpdateDeadlineDto } from './dto/update-deadline.dto'

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
      throw new NotFoundException(`書籍ID ${bookId} が見つかりません`)
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
      throw new NotFoundException(`書籍ID ${bookId} が見つかりません`)
    }

    return book
  }

  async create(
    bookId: number,
    createDeadlineDto: CreateDeadlineDto,
  ): Promise<Deadline> {
    // 書籍が存在するか確認
    const _book = await this.findBook(bookId)

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

  async findOne(id: number): Promise<Deadline> {
    const [deadline] = await this.drizzle.db
      .select()
      .from(deadlines)
      .where(eq(deadlines.id, id))
      .limit(1)

    if (!deadline) {
      throw new NotFoundException(`締切ID ${id} が見つかりません`)
    }

    return deadline
  }

  async update(
    id: number,
    updateDeadlineDto: UpdateDeadlineDto,
  ): Promise<Deadline> {
    // 締切が存在するか確認
    await this.findOne(id)

    const [deadline] = await this.drizzle.db
      .update(deadlines)
      .set({
        title: updateDeadlineDto.title,
        dueDate: new Date(updateDeadlineDto.dueDate),
        description: updateDeadlineDto.description,
      })
      .where(eq(deadlines.id, id))
      .returning()

    return deadline
  }

  async remove(id: number): Promise<number> {
    // 締切が存在するか確認
    const deadline = await this.findOne(id)

    await this.drizzle.db.delete(deadlines).where(eq(deadlines.id, id))

    return deadline.bookId
  }
}
