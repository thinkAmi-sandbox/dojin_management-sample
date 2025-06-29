import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { Book, NewBook, books } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookStatusDto } from './dto/update-book-status.dto'
import { UpdateBookDto } from './dto/update-book.dto'

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name)

  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Book[]> {
    return await this.drizzleService.db.select().from(books)
  }

  async findOne(id: number): Promise<Book> {
    const result = await this.drizzleService.db
      .select()
      .from(books)
      .where(eq(books.id, id))

    if (result.length === 0) {
      throw new NotFoundException(`書籍ID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const newBook: NewBook = {
      title: createBookDto.title,
      subtitle: createBookDto.subtitle || null,
      description: createBookDto.description || null,
    }

    this.logger.log('新規書籍を作成します', { title: createBookDto.title })

    const result = await this.drizzleService.db
      .insert(books)
      .values(newBook)
      .returning()

    this.logger.log('書籍が正常に作成されました', { bookId: result[0].id, title: result[0].title })

    return result[0]
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    await this.findOne(id)

    const updateData: Partial<NewBook> = {
      ...(updateBookDto.title !== undefined && { title: updateBookDto.title }),
      ...(updateBookDto.subtitle !== undefined && {
        subtitle: updateBookDto.subtitle || null,
      }),
      ...(updateBookDto.description !== undefined && {
        description: updateBookDto.description || null,
      }),
    }

    const result = await this.drizzleService.db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id)

    this.logger.warn('書籍を削除します', { bookId: id })

    await this.drizzleService.db.delete(books).where(eq(books.id, id))

    this.logger.warn('書籍が削除されました', { bookId: id })
  }

  async updateStatus(
    id: number,
    updateBookStatusDto: UpdateBookStatusDto,
  ): Promise<Book> {
    await this.findOne(id)

    const result = await this.drizzleService.db
      .update(books)
      .set({ status: updateBookStatusDto.status })
      .where(eq(books.id, id))
      .returning()

    return result[0]
  }
}
