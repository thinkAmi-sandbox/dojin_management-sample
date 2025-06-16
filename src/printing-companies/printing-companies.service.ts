import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { PrintingCompany, printingCompanies } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'

@Injectable()
export class PrintingCompaniesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<PrintingCompany[]> {
    return await this.drizzleService.db
      .select()
      .from(printingCompanies)
      .orderBy(printingCompanies.createdAt)
  }

  async findOne(id: number): Promise<PrintingCompany> {
    const result = await this.drizzleService.db
      .select()
      .from(printingCompanies)
      .where(eq(printingCompanies.id, id))

    if (result.length === 0) {
      throw new NotFoundException(`印刷所ID ${id} が見つかりません`)
    }

    return result[0]
  }
}
