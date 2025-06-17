import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { PrintingCompany, printingCompanies } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreatePrintingCompanyDto } from './dto/create-printing-company.dto'
import { UpdatePrintingCompanyDto } from './dto/update-printing-company.dto'

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

  async create(
    createPrintingCompanyDto: CreatePrintingCompanyDto,
  ): Promise<PrintingCompany> {
    const result = await this.drizzleService.db
      .insert(printingCompanies)
      .values({
        name: createPrintingCompanyDto.name,
        websiteUrl: createPrintingCompanyDto.website || null,
        notes: createPrintingCompanyDto.notes || null,
      })
      .returning()

    return result[0]
  }

  async update(
    id: number,
    updatePrintingCompanyDto: UpdatePrintingCompanyDto,
  ): Promise<PrintingCompany> {
    // 存在確認
    await this.findOne(id)

    const result = await this.drizzleService.db
      .update(printingCompanies)
      .set({
        name: updatePrintingCompanyDto.name,
        websiteUrl: updatePrintingCompanyDto.website
          ? updatePrintingCompanyDto.website
          : updatePrintingCompanyDto.website === ''
            ? null
            : undefined,
        notes: updatePrintingCompanyDto.notes
          ? updatePrintingCompanyDto.notes
          : updatePrintingCompanyDto.notes === ''
            ? null
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(printingCompanies.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db
      .delete(printingCompanies)
      .where(eq(printingCompanies.id, id))
  }
}
