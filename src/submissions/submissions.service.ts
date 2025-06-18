import { Injectable } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DrizzleService } from '../drizzle/drizzle.service'
import * as schema from '../db/schema'

@Injectable()
export class SubmissionsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll() {
    return await this.drizzleService.db
      .select({
        id: schema.submissions.id,
        status: schema.submissions.status,
        quantity: schema.submissions.quantity,
        deliveryDestination: schema.submissions.deliveryDestination,
        createdAt: schema.submissions.createdAt,
        updatedAt: schema.submissions.updatedAt,
        book: {
          id: schema.books.id,
          title: schema.books.title,
          subtitle: schema.books.subtitle,
        },
        printingCompany: {
          id: schema.printingCompanies.id,
          name: schema.printingCompanies.name,
        },
      })
      .from(schema.submissions)
      .innerJoin(schema.books, eq(schema.submissions.bookId, schema.books.id))
      .innerJoin(
        schema.printingCompanies,
        eq(schema.submissions.printingCompanyId, schema.printingCompanies.id),
      )
      .orderBy(desc(schema.submissions.createdAt))
  }

  async findByBook(bookId: number) {
    // 書籍の存在確認
    const book = await this.drizzleService.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        subtitle: schema.books.subtitle,
      })
      .from(schema.books)
      .where(eq(schema.books.id, bookId))
      .limit(1)

    if (book.length === 0) {
      throw new Error('Book not found')
    }

    // 書籍の入稿履歴を取得
    const submissions = await this.drizzleService.db
      .select({
        id: schema.submissions.id,
        status: schema.submissions.status,
        quantity: schema.submissions.quantity,
        deliveryDestination: schema.submissions.deliveryDestination,
        createdAt: schema.submissions.createdAt,
        updatedAt: schema.submissions.updatedAt,
        book: {
          id: schema.books.id,
          title: schema.books.title,
          subtitle: schema.books.subtitle,
        },
        printingCompany: {
          id: schema.printingCompanies.id,
          name: schema.printingCompanies.name,
        },
      })
      .from(schema.submissions)
      .innerJoin(schema.books, eq(schema.submissions.bookId, schema.books.id))
      .innerJoin(
        schema.printingCompanies,
        eq(schema.submissions.printingCompanyId, schema.printingCompanies.id),
      )
      .where(eq(schema.submissions.bookId, bookId))
      .orderBy(desc(schema.submissions.createdAt))

    return {
      book: book[0],
      submissions,
    }
  }
}
