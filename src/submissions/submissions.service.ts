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
}
