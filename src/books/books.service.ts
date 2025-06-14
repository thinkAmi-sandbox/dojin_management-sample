import { Injectable } from '@nestjs/common'
import { Book, books } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'

@Injectable()
export class BooksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Book[]> {
    return await this.drizzleService.db.select().from(books)
  }
}
