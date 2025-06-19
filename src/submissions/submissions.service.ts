import { Injectable, BadRequestException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DrizzleService } from '../drizzle/drizzle.service'
import * as schema from '../db/schema'
import { CreateSubmissionDto } from './dto/create-submission.dto'

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

  async create(
    bookId: number,
    createSubmissionDto: CreateSubmissionDto,
  ): Promise<void> {
    // 印刷所の存在確認
    const printingCompany = await this.drizzleService.db
      .select({ id: schema.printingCompanies.id })
      .from(schema.printingCompanies)
      .where(
        eq(schema.printingCompanies.id, createSubmissionDto.printingCompanyId),
      )
      .limit(1)

    if (printingCompany.length === 0) {
      throw new BadRequestException('指定された印刷所が見つかりません')
    }

    // 入稿データの作成
    const submissionData: any = {
      bookId,
      printingCompanyId: createSubmissionDto.printingCompanyId,
      quantity: createSubmissionDto.quantity,
      status: 'draft', // デフォルトステータス
    }

    // オプションフィールドの設定
    if (createSubmissionDto.submissionDate) {
      submissionData.submissionDate = new Date(
        createSubmissionDto.submissionDate,
      )
    }
    if (createSubmissionDto.expectedDeliveryDate) {
      submissionData.expectedDeliveryDate = new Date(
        createSubmissionDto.expectedDeliveryDate,
      )
    }
    if (createSubmissionDto.specificationNotes) {
      submissionData.specificationNotes = createSubmissionDto.specificationNotes
    }
    if (
      createSubmissionDto.printingCost !== null &&
      createSubmissionDto.printingCost !== undefined
    ) {
      submissionData.printingCost = createSubmissionDto.printingCost
    }
    if (
      createSubmissionDto.shippingCost !== null &&
      createSubmissionDto.shippingCost !== undefined
    ) {
      submissionData.shippingCost = createSubmissionDto.shippingCost
    }
    if (
      createSubmissionDto.otherCost !== null &&
      createSubmissionDto.otherCost !== undefined
    ) {
      submissionData.otherCost = createSubmissionDto.otherCost
    }
    if (createSubmissionDto.discountType) {
      submissionData.discountType = createSubmissionDto.discountType
    }
    if (createSubmissionDto.deliveryDestination) {
      submissionData.deliveryDestination =
        createSubmissionDto.deliveryDestination
    }
    if (createSubmissionDto.deliveryNotes) {
      submissionData.deliveryNotes = createSubmissionDto.deliveryNotes
    }
    if (createSubmissionDto.submissionFileNotes) {
      submissionData.submissionFileNotes =
        createSubmissionDto.submissionFileNotes
    }
    if (createSubmissionDto.generalNotes) {
      submissionData.generalNotes = createSubmissionDto.generalNotes
    }

    // 合計コストの計算
    if (
      submissionData.printingCost !== undefined ||
      submissionData.shippingCost !== undefined ||
      submissionData.otherCost !== undefined
    ) {
      submissionData.totalCost =
        (submissionData.printingCost || 0) +
        (submissionData.shippingCost || 0) +
        (submissionData.otherCost || 0)
    }

    await this.drizzleService.db
      .insert(schema.submissions)
      .values(submissionData)
  }
}
