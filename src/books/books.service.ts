import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { Book, NewBook, books } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookDto } from './dto/update-book.dto'

@Injectable()
export class BooksService {
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
      pageCount: createBookDto.pageCount || null,
    }

    const result = await this.drizzleService.db
      .insert(books)
      .values(newBook)
      .returning()

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
      ...(updateBookDto.pageCount !== undefined && {
        pageCount: updateBookDto.pageCount || null,
      }),
    }

    const result = await this.drizzleService.db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning()

    return result[0]
  }
}
