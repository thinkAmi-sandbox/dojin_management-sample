import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'
import { UpdateSubmissionDto } from './dto/update-submission.dto'
import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto'
import { UpdateSubmissionCostsDto } from './dto/update-submission-costs.dto'
import { SubmissionsService } from './submissions.service'

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly printingCompaniesService: PrintingCompaniesService,
  ) {}

  @Get()
  @Render('submissions/index')
  async findAll() {
    const submissions = await this.submissionsService.findAll()

    // ステータスの日本語変換
    const statusMap = {
      draft: '準備中',
      submitted: '入稿済み',
      printing: '印刷中',
      delivered: '納品済み',
      cancelled: 'キャンセル',
    }

    return {
      title: '入稿一覧',
      submissions: submissions.map((submission) => ({
        id: submission.id,
        status:
          statusMap[submission.status as keyof typeof statusMap] ||
          submission.status,
        quantity: submission.quantity,
        deliveryDestination: submission.deliveryDestination || '-',
        bookTitle: submission.book.title,
        bookSubtitle: submission.book.subtitle || '',
        printingCompanyName: submission.printingCompany.name,
        formattedCreatedAt: submission.createdAt.toLocaleDateString('ja-JP'),
        detailUrl: `/submissions/${submission.id}`,
        editUrl: `/submissions/${submission.id}/edit`,
      })),
    }
  }

  @Get('costs')
  @Render('submissions/costs')
  async findCosts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.submissionsService.findCosts({
      startDate,
      endDate,
      status,
    })

    // ステータスの日本語変換
    const statusMap = {
      draft: '準備中',
      submitted: '入稿済み',
      printing: '印刷中',
      delivered: '納品済み',
      cancelled: 'キャンセル',
    }

    // 金額フォーマット関数
    const formatCurrency = (amount: number) => {
      return Math.round(amount).toLocaleString('ja-JP')
    }

    // 統計情報の計算
    const urgentCount = result.printingCompanyCosts.filter((item) => {
      return item.count >= 3 // 3件以上を多発注として扱う
    }).length

    return {
      title: '入稿コスト集計',

      // 印刷所別集計
      printingCompanyCosts: result.printingCompanyCosts.map((item) => ({
        printingCompanyId: item.printingCompanyId,
        printingCompanyName: item.printingCompanyName,
        totalCost: formatCurrency(item.totalCost),
        count: item.count,
        avgCost: formatCurrency(Math.round(item.avgCost)),
      })),

      // 書籍別集計
      bookCosts: result.bookCosts.map((item) => ({
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        bookSubtitle: item.bookSubtitle || '',
        totalCost: formatCurrency(item.totalCost),
        count: item.count,
        avgCost: formatCurrency(Math.round(item.avgCost)),
      })),

      // 月別集計
      monthlyCosts: result.monthlyCosts.map((item) => ({
        yearMonth: item.yearMonth || '不明',
        totalCost: formatCurrency(item.totalCost),
        count: item.count,
      })),

      // 統計情報
      statistics: {
        totalCost: formatCurrency(result.statistics.totalCost),
        avgCost: formatCurrency(Math.round(result.statistics.avgCost)),
        maxCost: formatCurrency(result.statistics.maxCost),
        minCost: formatCurrency(result.statistics.minCost),
        totalCount: result.statistics.totalCount,
      },

      // フィルター情報
      filters: {
        startDate: startDate || '',
        endDate: endDate || '',
        status: status || '',
        statusLabel: status
          ? statusMap[status as keyof typeof statusMap] || status
          : '',
      },

      // データ有無フラグ
      hasData: result.statistics.totalCount > 0,

      // パンくずリスト
      breadcrumbs: [
        { name: '入稿一覧', url: '/submissions' },
        { name: 'コスト集計', url: null },
      ],
    }
  }

  @Get('in-progress')
  @Render('submissions/in-progress')
  async findInProgress() {
    const submissions = await this.submissionsService.findInProgress()

    // ステータスの日本語変換
    const statusMap = {
      submitted: '入稿済み',
      printing: '印刷中',
    }

    // 日付フォーマット関数
    const formatDate = (date: Date | null) => {
      return date ? date.toLocaleDateString('ja-JP') : '-'
    }

    // 納期アラート判定（3日以内）
    const isUrgent = (date: Date | null) => {
      if (!date) return false
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      return date <= threeDaysFromNow
    }

    return {
      title: '進行中の入稿一覧',
      submissions: submissions.map((submission) => ({
        id: submission.id,
        status:
          statusMap[submission.status as keyof typeof statusMap] ||
          submission.status,
        quantity: submission.quantity,
        deliveryDestination: submission.deliveryDestination || '-',
        bookTitle: submission.book.title,
        bookSubtitle: submission.book.subtitle || '',
        printingCompanyName: submission.printingCompany.name,
        submissionDate: formatDate(submission.submissionDate),
        expectedDeliveryDate: formatDate(submission.expectedDeliveryDate),
        isUrgent: isUrgent(submission.expectedDeliveryDate),
        detailUrl: `/submissions/${submission.id}`,
        editUrl: `/submissions/${submission.id}/edit`,
      })),
      inProgressCount: submissions.length,
    }
  }

  @Get(':id')
  @Render('submissions/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.submissionsService.findOne(id)

    // ステータスの日本語変換
    const statusMap = {
      draft: '準備中',
      submitted: '入稿済み',
      printing: '印刷中',
      delivered: '納品済み',
      cancelled: 'キャンセル',
    }

    // 金額フォーマット関数
    const formatCurrency = (amount: number | null) => {
      return amount !== null ? amount.toLocaleString('ja-JP') + '円' : '-'
    }

    // 日付フォーマット関数
    const formatDate = (date: Date | null) => {
      return date ? date.toLocaleDateString('ja-JP') : '-'
    }

    return {
      title: '入稿詳細',
      submission: {
        id: submission.id,
        status:
          statusMap[submission.status as keyof typeof statusMap] ||
          submission.status,

        // 基本情報
        book: {
          title: submission.book.title,
          subtitle: submission.book.subtitle || '-',
          description: submission.book.description || '-',
        },
        printingCompany: {
          name: submission.printingCompany.name,
          websiteUrl: submission.printingCompany.websiteUrl || '-',
        },

        // 日付情報
        submissionDate: formatDate(submission.submissionDate),
        expectedDeliveryDate: formatDate(submission.expectedDeliveryDate),
        actualDeliveryDate: formatDate(submission.actualDeliveryDate),

        // 印刷情報
        quantity: submission.quantity + '部',
        specificationNotes: submission.specificationNotes || '-',

        // コスト情報
        printingCost: formatCurrency(submission.printingCost),
        shippingCost: formatCurrency(submission.shippingCost),
        otherCost: formatCurrency(submission.otherCost),
        totalCost: formatCurrency(submission.totalCost),
        discountType: submission.discountType || '-',

        // 配送情報
        deliveryDestination: submission.deliveryDestination || '-',
        deliveryNotes: submission.deliveryNotes || '-',

        // その他
        submissionFileNotes: submission.submissionFileNotes || '-',
        generalNotes: submission.generalNotes || '-',

        // タイムスタンプ
        formattedCreatedAt: submission.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: submission.updatedAt.toLocaleDateString('ja-JP'),
      },
      editUrl: `/submissions/${submission.id}/edit`,
      deleteUrl: `/submissions/${submission.id}`,
      listUrl: '/submissions',
      bookSubmissionsUrl: `/books/${submission.book.id}/submissions`,
    }
  }

  @Get(':id/edit')
  @Render('submissions/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.submissionsService.findOne(id)
    const printingCompanies = await this.printingCompaniesService.findAll()

    // 日付フォーマット関数（YYYY-MM-DD形式に変換）
    const formatDateForInput = (date: Date | null) => {
      return date ? date.toISOString().split('T')[0] : ''
    }

    return {
      title: '入稿編集',
      submission: {
        id: submission.id,
        printingCompanyId: submission.printingCompany.id,
        status: submission.status,
        quantity: submission.quantity,
        submissionDate: formatDateForInput(submission.submissionDate),
        expectedDeliveryDate: formatDateForInput(
          submission.expectedDeliveryDate,
        ),
        specificationNotes: submission.specificationNotes || '',
        printingCost: submission.printingCost || '',
        shippingCost: submission.shippingCost || '',
        otherCost: submission.otherCost || '',
        discountType: submission.discountType || '',
        deliveryDestination: submission.deliveryDestination || '',
        deliveryNotes: submission.deliveryNotes || '',
        submissionFileNotes: submission.submissionFileNotes || '',
        generalNotes: submission.generalNotes || '',
      },
      printingCompanies: printingCompanies.map((company) => ({
        id: company.id,
        name: company.name,
      })),
      errors: {},
      breadcrumbs: [
        { name: '入稿一覧', url: '/submissions' },
        { name: '入稿詳細', url: `/submissions/${id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // ValidationPipeを手動で適用
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateSubmissionDto,
      })
      return this.update(id, validatedDto, res)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
    @Res() res: Response,
  ) {
    try {
      await this.submissionsService.update(id, updateSubmissionDto)
      return res.redirect(`/submissions/${id}`)
    } catch (error) {
      // ビジネスロジックエラーの処理
      if (error instanceof Error && error.message.includes('見つかりません')) {
        const submission = await this.submissionsService.findOne(id)
        const printingCompanies = await this.printingCompaniesService.findAll()

        return res.status(200).render('submissions/edit', {
          title: '入稿編集',
          submission: {
            id: id,
            printingCompanyId: submission.printingCompany.id,
            status: submission.status,
            quantity: submission.quantity,
            submissionDate:
              submission.submissionDate?.toISOString().split('T')[0] || '',
            expectedDeliveryDate:
              submission.expectedDeliveryDate?.toISOString().split('T')[0] ||
              '',
            specificationNotes: submission.specificationNotes || '',
            printingCost: submission.printingCost || '',
            shippingCost: submission.shippingCost || '',
            otherCost: submission.otherCost || '',
            discountType: submission.discountType || '',
            deliveryDestination: submission.deliveryDestination || '',
            deliveryNotes: submission.deliveryNotes || '',
            submissionFileNotes: submission.submissionFileNotes || '',
            generalNotes: submission.generalNotes || '',
          },
          printingCompanies: printingCompanies.map((company) => ({
            id: company.id,
            name: company.name,
          })),
          errors: { general: error.message },
          breadcrumbs: [
            { name: '入稿一覧', url: '/submissions' },
            { name: '入稿詳細', url: `/submissions/${id}` },
            { name: '編集', url: null },
          ],
        })
      }
      throw error
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.submissionsService.remove(id)
      res.redirect('/submissions')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('入稿が見つかりませんでした')
      }
      throw error
    }
  }

  @Get(':id/status/edit')
  @Render('submissions/status/edit')
  async renderStatusEditForm(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.submissionsService.findOne(id)

    return {
      title: 'ステータス変更',
      submission: {
        id: submission.id,
        status: submission.status,
        book: {
          title: submission.book.title,
          subtitle: submission.book.subtitle || '',
        },
        printingCompany: {
          name: submission.printingCompany.name,
        },
      },
      errors: {},
      breadcrumbs: [
        { name: '入稿一覧', url: '/submissions' },
        { name: '入稿詳細', url: `/submissions/${id}` },
        { name: 'ステータス変更', url: null },
      ],
    }
  }

  @Post(':id/status')
  async updateStatusViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateSubmissionStatusDto,
      })
      return this.updateStatus(id, validatedDto, res)
    }
    res.status(404).send('Not Found')
  }

  @Put(':id/status')
  @UsePipes(ValidationPipe)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubmissionStatusDto: UpdateSubmissionStatusDto,
    @Res() res: Response,
  ) {
    await this.submissionsService.updateStatus(id, updateSubmissionStatusDto)
    return res.redirect(`/submissions/${id}`)
  }

  @Get(':id/costs/edit')
  @Render('submissions/costs/edit')
  async renderCostsEditForm(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.submissionsService.findOne(id)

    return {
      title: 'コスト情報変更',
      submission: {
        id: submission.id,
        printingCost: submission.printingCost || '',
        shippingCost: submission.shippingCost || '',
        otherCost: submission.otherCost || '',
        book: {
          title: submission.book.title,
          subtitle: submission.book.subtitle || '',
        },
        printingCompany: {
          name: submission.printingCompany.name,
        },
      },
      errors: {},
      breadcrumbs: [
        { name: '入稿一覧', url: '/submissions' },
        { name: '入稿詳細', url: `/submissions/${id}` },
        { name: 'コスト情報変更', url: null },
      ],
    }
  }

  @Post(':id/costs')
  async updateCostsViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateSubmissionCostsDto,
      })
      return this.updateCosts(id, validatedDto, res)
    }
    res.status(404).send('Not Found')
  }

  @Put(':id/costs')
  @UsePipes(ValidationPipe)
  async updateCosts(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubmissionCostsDto: UpdateSubmissionCostsDto,
    @Res() res: Response,
  ) {
    await this.submissionsService.updateCosts(id, updateSubmissionCostsDto)
    return res.redirect(`/submissions/${id}`)
  }
}
