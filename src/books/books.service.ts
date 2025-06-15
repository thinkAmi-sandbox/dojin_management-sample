import { Injectable } from '@nestjs/common'
import { Book, NewBook, books } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateBookDto } from './dto/create-book.dto'

@Injectable()
export class BooksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Book[]> {
    return await this.drizzleService.db.select().from(books)
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
}
