import { Controller, Get, Render } from '@nestjs/common'
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
}
