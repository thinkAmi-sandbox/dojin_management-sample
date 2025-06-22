import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { asc, desc, eq, inArray, sql, and, gte, lte } from 'drizzle-orm'
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateSubmissionDto } from './dto/create-submission.dto'
import { UpdateSubmissionDto } from './dto/update-submission.dto'
import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto'
import { UpdateSubmissionCostsDto } from './dto/update-submission-costs.dto'

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

  async findInProgress() {
    return await this.drizzleService.db
      .select({
        id: schema.submissions.id,
        status: schema.submissions.status,
        quantity: schema.submissions.quantity,
        deliveryDestination: schema.submissions.deliveryDestination,
        submissionDate: schema.submissions.submissionDate,
        expectedDeliveryDate: schema.submissions.expectedDeliveryDate,
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
      .where(inArray(schema.submissions.status, ['submitted', 'printing']))
      .orderBy(asc(schema.submissions.expectedDeliveryDate))
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

  async findOne(id: number) {
    const submission = await this.drizzleService.db
      .select({
        // 入稿の全フィールド
        id: schema.submissions.id,
        status: schema.submissions.status,
        submissionDate: schema.submissions.submissionDate,
        expectedDeliveryDate: schema.submissions.expectedDeliveryDate,
        actualDeliveryDate: schema.submissions.actualDeliveryDate,
        quantity: schema.submissions.quantity,
        specificationNotes: schema.submissions.specificationNotes,
        printingCost: schema.submissions.printingCost,
        shippingCost: schema.submissions.shippingCost,
        otherCost: schema.submissions.otherCost,
        totalCost: schema.submissions.totalCost,
        discountType: schema.submissions.discountType,
        deliveryDestination: schema.submissions.deliveryDestination,
        deliveryNotes: schema.submissions.deliveryNotes,
        submissionFileNotes: schema.submissions.submissionFileNotes,
        generalNotes: schema.submissions.generalNotes,
        createdAt: schema.submissions.createdAt,
        updatedAt: schema.submissions.updatedAt,
        // 書籍情報
        book: {
          id: schema.books.id,
          title: schema.books.title,
          subtitle: schema.books.subtitle,
          description: schema.books.description,
        },
        // 印刷所情報
        printingCompany: {
          id: schema.printingCompanies.id,
          name: schema.printingCompanies.name,
          websiteUrl: schema.printingCompanies.websiteUrl,
        },
      })
      .from(schema.submissions)
      .innerJoin(schema.books, eq(schema.submissions.bookId, schema.books.id))
      .innerJoin(
        schema.printingCompanies,
        eq(schema.submissions.printingCompanyId, schema.printingCompanies.id),
      )
      .where(eq(schema.submissions.id, id))
      .limit(1)

    if (submission.length === 0) {
      throw new NotFoundException('入稿が見つかりません')
    }

    return submission[0]
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
    const submissionData: {
      bookId: number
      printingCompanyId: number
      quantity: number
      status: string
      submissionDate?: Date
      expectedDeliveryDate?: Date
      specificationNotes?: string | null
      printingCost?: number | null
      shippingCost?: number | null
      otherCost?: number | null
      totalCost?: number | null
      discountType?: string | null
      deliveryDestination?: string | null
      deliveryNotes?: string | null
      submissionFileNotes?: string | null
      generalNotes?: string | null
    } = {
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

  async update(
    id: number,
    updateSubmissionDto: UpdateSubmissionDto,
  ): Promise<void> {
    // 入稿の存在確認
    const existingSubmission = await this.drizzleService.db
      .select({ id: schema.submissions.id })
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id))
      .limit(1)

    if (existingSubmission.length === 0) {
      throw new NotFoundException('入稿が見つかりません')
    }

    // 印刷所の存在確認（印刷所IDが指定されている場合）
    if (updateSubmissionDto.printingCompanyId) {
      const printingCompany = await this.drizzleService.db
        .select({ id: schema.printingCompanies.id })
        .from(schema.printingCompanies)
        .where(
          eq(
            schema.printingCompanies.id,
            updateSubmissionDto.printingCompanyId,
          ),
        )
        .limit(1)

      if (printingCompany.length === 0) {
        throw new BadRequestException('指定された印刷所が見つかりません')
      }
    }

    // 更新データの構築
    const updateData: any = {}

    // 基本情報の更新
    if (updateSubmissionDto.printingCompanyId !== undefined) {
      updateData.printingCompanyId = updateSubmissionDto.printingCompanyId
    }
    if (updateSubmissionDto.status !== undefined) {
      updateData.status = updateSubmissionDto.status
    }
    if (updateSubmissionDto.quantity !== undefined) {
      updateData.quantity = updateSubmissionDto.quantity
    }

    // 日付フィールドの更新
    if (updateSubmissionDto.submissionDate !== undefined) {
      updateData.submissionDate = updateSubmissionDto.submissionDate
        ? new Date(updateSubmissionDto.submissionDate)
        : null
    }
    if (updateSubmissionDto.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = updateSubmissionDto.expectedDeliveryDate
        ? new Date(updateSubmissionDto.expectedDeliveryDate)
        : null
    }

    // テキストフィールドの更新
    if (updateSubmissionDto.specificationNotes !== undefined) {
      updateData.specificationNotes =
        updateSubmissionDto.specificationNotes || null
    }
    if (updateSubmissionDto.discountType !== undefined) {
      updateData.discountType = updateSubmissionDto.discountType || null
    }
    if (updateSubmissionDto.deliveryDestination !== undefined) {
      updateData.deliveryDestination =
        updateSubmissionDto.deliveryDestination || null
    }
    if (updateSubmissionDto.deliveryNotes !== undefined) {
      updateData.deliveryNotes = updateSubmissionDto.deliveryNotes || null
    }
    if (updateSubmissionDto.submissionFileNotes !== undefined) {
      updateData.submissionFileNotes =
        updateSubmissionDto.submissionFileNotes || null
    }
    if (updateSubmissionDto.generalNotes !== undefined) {
      updateData.generalNotes = updateSubmissionDto.generalNotes || null
    }

    // コストフィールドの更新
    if (updateSubmissionDto.printingCost !== undefined) {
      updateData.printingCost = updateSubmissionDto.printingCost
    }
    if (updateSubmissionDto.shippingCost !== undefined) {
      updateData.shippingCost = updateSubmissionDto.shippingCost
    }
    if (updateSubmissionDto.otherCost !== undefined) {
      updateData.otherCost = updateSubmissionDto.otherCost
    }

    // 合計コストの再計算（コスト関連のフィールドが更新された場合）
    if (
      updateSubmissionDto.printingCost !== undefined ||
      updateSubmissionDto.shippingCost !== undefined ||
      updateSubmissionDto.otherCost !== undefined
    ) {
      // 現在のデータを取得して、更新されていないコスト項目を含めて計算
      const currentSubmission = await this.drizzleService.db
        .select({
          printingCost: schema.submissions.printingCost,
          shippingCost: schema.submissions.shippingCost,
          otherCost: schema.submissions.otherCost,
        })
        .from(schema.submissions)
        .where(eq(schema.submissions.id, id))
        .limit(1)

      const current = currentSubmission[0]
      const finalPrintingCost =
        updateData.printingCost !== undefined
          ? updateData.printingCost
          : current.printingCost
      const finalShippingCost =
        updateData.shippingCost !== undefined
          ? updateData.shippingCost
          : current.shippingCost
      const finalOtherCost =
        updateData.otherCost !== undefined
          ? updateData.otherCost
          : current.otherCost

      // 型を数値に確実に変換
      const printingCostNum = finalPrintingCost ? Number(finalPrintingCost) : 0
      const shippingCostNum = finalShippingCost ? Number(finalShippingCost) : 0
      const otherCostNum = finalOtherCost ? Number(finalOtherCost) : 0

      // いずれかがnullの場合は合計もnullにする
      if (
        finalPrintingCost === null &&
        finalShippingCost === null &&
        finalOtherCost === null
      ) {
        updateData.totalCost = null
      } else {
        updateData.totalCost = printingCostNum + shippingCostNum + otherCostNum
      }
    }

    // updatedAtを現在時刻に設定
    updateData.updatedAt = new Date()

    // データベース更新
    await this.drizzleService.db
      .update(schema.submissions)
      .set(updateData)
      .where(eq(schema.submissions.id, id))
  }

  async remove(id: number): Promise<void> {
    // 入稿の存在確認
    await this.findOne(id)

    // 入稿データを削除
    await this.drizzleService.db
      .delete(schema.submissions)
      .where(eq(schema.submissions.id, id))
  }

  async findCosts(filters?: {
    startDate?: string
    endDate?: string
    status?: string
  }) {
    // WHERE条件の構築
    const whereConditions = []

    if (filters?.startDate) {
      whereConditions.push(
        gte(schema.submissions.submissionDate, new Date(filters.startDate)),
      )
    }

    if (filters?.endDate) {
      whereConditions.push(
        lte(schema.submissions.submissionDate, new Date(filters.endDate)),
      )
    }

    if (filters?.status) {
      whereConditions.push(eq(schema.submissions.status, filters.status))
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined

    // 印刷所別集計
    const printingCompanyCosts = await this.drizzleService.db
      .select({
        printingCompanyId: schema.submissions.printingCompanyId,
        printingCompanyName: schema.printingCompanies.name,
        totalCost: sql<number>`COALESCE(SUM(${schema.submissions.totalCost}), 0)`,
        count: sql<number>`COUNT(*)`,
        avgCost: sql<number>`COALESCE(AVG(${schema.submissions.totalCost}), 0)`,
      })
      .from(schema.submissions)
      .innerJoin(
        schema.printingCompanies,
        eq(schema.submissions.printingCompanyId, schema.printingCompanies.id),
      )
      .where(whereClause)
      .groupBy(
        schema.submissions.printingCompanyId,
        schema.printingCompanies.name,
      )
      .orderBy(desc(sql<number>`SUM(${schema.submissions.totalCost})`))

    // 書籍別集計
    const bookCosts = await this.drizzleService.db
      .select({
        bookId: schema.submissions.bookId,
        bookTitle: schema.books.title,
        bookSubtitle: schema.books.subtitle,
        totalCost: sql<number>`COALESCE(SUM(${schema.submissions.totalCost}), 0)`,
        count: sql<number>`COUNT(*)`,
        avgCost: sql<number>`COALESCE(AVG(${schema.submissions.totalCost}), 0)`,
      })
      .from(schema.submissions)
      .innerJoin(schema.books, eq(schema.submissions.bookId, schema.books.id))
      .where(whereClause)
      .groupBy(
        schema.submissions.bookId,
        schema.books.title,
        schema.books.subtitle,
      )
      .orderBy(desc(sql<number>`SUM(${schema.submissions.totalCost})`))

    // 月別集計
    const monthlyCosts = await this.drizzleService.db
      .select({
        yearMonth: sql<string>`TO_CHAR(${schema.submissions.submissionDate}, 'YYYY-MM')`,
        totalCost: sql<number>`COALESCE(SUM(${schema.submissions.totalCost}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.submissions)
      .where(
        and(whereClause, sql`${schema.submissions.submissionDate} IS NOT NULL`),
      )
      .groupBy(sql`TO_CHAR(${schema.submissions.submissionDate}, 'YYYY-MM')`)
      .orderBy(
        desc(sql`TO_CHAR(${schema.submissions.submissionDate}, 'YYYY-MM')`),
      )

    // 統計情報の取得
    const statistics = await this.drizzleService.db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${schema.submissions.totalCost}), 0)`,
        avgCost: sql<number>`COALESCE(AVG(${schema.submissions.totalCost}), 0)`,
        maxCost: sql<number>`COALESCE(MAX(${schema.submissions.totalCost}), 0)`,
        minCost: sql<number>`COALESCE(MIN(${schema.submissions.totalCost}), 0)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(schema.submissions)
      .where(whereClause)

    return {
      printingCompanyCosts,
      bookCosts,
      monthlyCosts,
      statistics: statistics[0] || {
        totalCost: 0,
        avgCost: 0,
        maxCost: 0,
        minCost: 0,
        totalCount: 0,
      },
      filters,
    }
  }

  /**
   * 入稿のステータスを更新する
   */
  async updateStatus(
    id: number,
    updateSubmissionStatusDto: UpdateSubmissionStatusDto,
  ): Promise<void> {
    // 入稿の存在確認
    const existingSubmission = await this.drizzleService.db
      .select({ id: schema.submissions.id })
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id))
      .limit(1)

    if (existingSubmission.length === 0) {
      throw new NotFoundException('入稿が見つかりません')
    }

    // ステータス更新
    await this.drizzleService.db
      .update(schema.submissions)
      .set({
        status: updateSubmissionStatusDto.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.submissions.id, id))
  }

  /**
   * 入稿のコスト情報を更新する
   */
  async updateCosts(
    id: number,
    updateSubmissionCostsDto: UpdateSubmissionCostsDto,
  ): Promise<void> {
    // 入稿の存在確認
    const existingSubmission = await this.drizzleService.db
      .select({ id: schema.submissions.id })
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id))
      .limit(1)

    if (existingSubmission.length === 0) {
      throw new NotFoundException('入稿が見つかりません')
    }

    // 合計コストの計算
    const printingCost = updateSubmissionCostsDto.printingCost || 0
    const shippingCost = updateSubmissionCostsDto.shippingCost || 0
    const otherCost = updateSubmissionCostsDto.otherCost || 0
    const totalCost = printingCost + shippingCost + otherCost

    // コスト情報更新
    await this.drizzleService.db
      .update(schema.submissions)
      .set({
        printingCost: updateSubmissionCostsDto.printingCost,
        shippingCost: updateSubmissionCostsDto.shippingCost,
        otherCost: updateSubmissionCostsDto.otherCost,
        totalCost: totalCost,
        updatedAt: new Date(),
      })
      .where(eq(schema.submissions.id, id))
  }
}
