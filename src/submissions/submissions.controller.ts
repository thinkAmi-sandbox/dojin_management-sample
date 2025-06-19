import {
  Controller,
  Get,
  Render,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common'
import { SubmissionsService } from './submissions.service'

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

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
}
