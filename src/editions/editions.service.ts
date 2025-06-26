import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { NewEdition } from '../db/schema'
import { editions } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import type { CreateEditionDto } from './dto/create-edition.dto'
import type { UpdateEditionDto } from './dto/update-edition.dto'

@Injectable()
export class EditionsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(bookId: number, createEditionDto: CreateEditionDto) {
    const newEdition: NewEdition = {
      bookId,
      versionName: createEditionDto.versionName,
      versionNumber: createEditionDto.versionNumber,
      isbn: createEditionDto.isbn,
      pageCount: createEditionDto.pageCount,
      basePrice: createEditionDto.basePrice,
      printingCost: createEditionDto.printingCost,
      publishDate: createEditionDto.publishDate || null,
      editionNotes: createEditionDto.editionNotes,
      coverImageUrl: createEditionDto.coverImageUrl,
      isActive: createEditionDto.isActive ?? true,
      isSoldOut: createEditionDto.isSoldOut ?? false,
    }

    const [edition] = await this.drizzleService.db
      .insert(editions)
      .values(newEdition)
      .returning()

    return edition
  }

  async findAllByBookId(bookId: number) {
    return await this.drizzleService.db
      .select()
      .from(editions)
      .where(eq(editions.bookId, bookId))
      .orderBy(editions.versionNumber)
  }

  async findOne(id: number) {
    const result = await this.drizzleService.db
      .select()
      .from(editions)
      .where(eq(editions.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('版が見つかりません')
    }

    return result[0]
  }

  async update(id: number, updateEditionDto: UpdateEditionDto) {
    // 存在確認
    await this.findOne(id)

    const updateData: Partial<NewEdition> = {}

    if (updateEditionDto.versionName !== undefined) {
      updateData.versionName = updateEditionDto.versionName
    }
    if (updateEditionDto.versionNumber !== undefined) {
      updateData.versionNumber = updateEditionDto.versionNumber
    }
    if (updateEditionDto.isbn !== undefined) {
      updateData.isbn = updateEditionDto.isbn
    }
    if (updateEditionDto.pageCount !== undefined) {
      updateData.pageCount = updateEditionDto.pageCount
    }
    if (updateEditionDto.basePrice !== undefined) {
      updateData.basePrice = updateEditionDto.basePrice
    }
    if (updateEditionDto.printingCost !== undefined) {
      updateData.printingCost = updateEditionDto.printingCost
    }
    if (updateEditionDto.publishDate !== undefined) {
      updateData.publishDate = updateEditionDto.publishDate || null
    }
    if (updateEditionDto.editionNotes !== undefined) {
      updateData.editionNotes = updateEditionDto.editionNotes
    }
    if (updateEditionDto.coverImageUrl !== undefined) {
      updateData.coverImageUrl = updateEditionDto.coverImageUrl
    }
    if (updateEditionDto.isActive !== undefined) {
      updateData.isActive = updateEditionDto.isActive
    }
    if (updateEditionDto.isSoldOut !== undefined) {
      updateData.isSoldOut = updateEditionDto.isSoldOut
    }

    const [updatedEdition] = await this.drizzleService.db
      .update(editions)
      .set(updateData)
      .where(eq(editions.id, id))
      .returning()

    return updatedEdition
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db.delete(editions).where(eq(editions.id, id))
  }
}
