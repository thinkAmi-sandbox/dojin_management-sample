import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'
import { UpdateSubmissionDto } from './dto/update-submission.dto'
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
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      return this.update(id, body, res)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubmissionDto: any,
    @Res() res: Response,
  ) {
    // 手動バリデーション
    const errors: any = {}

    // 部数のバリデーション
    if (
      !updateSubmissionDto.quantity ||
      updateSubmissionDto.quantity.toString().trim() === ''
    ) {
      errors.quantity = '部数を入力してください'
    } else {
      const quantity = Number.parseInt(updateSubmissionDto.quantity, 10)
      if (isNaN(quantity) || quantity < 1) {
        errors.quantity = '部数は1以上で入力してください'
      }
    }

    // 印刷所IDのバリデーション
    if (!updateSubmissionDto.printingCompanyId) {
      errors.printingCompanyId = '印刷所を選択してください'
    }

    // エラーがある場合は編集フォームを再表示
    if (Object.keys(errors).length > 0) {
      const submission = await this.submissionsService.findOne(id)
      const printingCompanies = await this.printingCompaniesService.findAll()

      return res.status(200).render('submissions/edit', {
        title: '入稿編集',
        submission: {
          id: id,
          printingCompanyId:
            updateSubmissionDto.printingCompanyId ||
            submission.printingCompany.id,
          status: updateSubmissionDto.status || submission.status,
          quantity: updateSubmissionDto.quantity || '',
          submissionDate: updateSubmissionDto.submissionDate || '',
          expectedDeliveryDate: updateSubmissionDto.expectedDeliveryDate || '',
          specificationNotes: updateSubmissionDto.specificationNotes || '',
          printingCost: updateSubmissionDto.printingCost || '',
          shippingCost: updateSubmissionDto.shippingCost || '',
          otherCost: updateSubmissionDto.otherCost || '',
          discountType: updateSubmissionDto.discountType || '',
          deliveryDestination: updateSubmissionDto.deliveryDestination || '',
          deliveryNotes: updateSubmissionDto.deliveryNotes || '',
          submissionFileNotes: updateSubmissionDto.submissionFileNotes || '',
          generalNotes: updateSubmissionDto.generalNotes || '',
        },
        printingCompanies: printingCompanies.map((company) => ({
          id: company.id,
          name: company.name,
        })),
        errors,
        breadcrumbs: [
          { name: '入稿一覧', url: '/submissions' },
          { name: '入稿詳細', url: `/submissions/${id}` },
          { name: '編集', url: null },
        ],
      })
    }

    // DTOに変換（手動バリデーション通過後）
    const validatedDto: UpdateSubmissionDto = {
      printingCompanyId: updateSubmissionDto.printingCompanyId
        ? Number.parseInt(updateSubmissionDto.printingCompanyId, 10)
        : undefined,
      status: updateSubmissionDto.status,
      quantity: updateSubmissionDto.quantity
        ? Number.parseInt(updateSubmissionDto.quantity, 10)
        : undefined,
      submissionDate:
        updateSubmissionDto.submissionDate &&
        updateSubmissionDto.submissionDate !== ''
          ? updateSubmissionDto.submissionDate
          : null,
      expectedDeliveryDate:
        updateSubmissionDto.expectedDeliveryDate &&
        updateSubmissionDto.expectedDeliveryDate !== ''
          ? updateSubmissionDto.expectedDeliveryDate
          : null,
      specificationNotes:
        updateSubmissionDto.specificationNotes &&
        updateSubmissionDto.specificationNotes !== ''
          ? updateSubmissionDto.specificationNotes
          : null,
      printingCost:
        updateSubmissionDto.printingCost &&
        updateSubmissionDto.printingCost !== ''
          ? Number.parseInt(updateSubmissionDto.printingCost, 10)
          : null,
      shippingCost:
        updateSubmissionDto.shippingCost &&
        updateSubmissionDto.shippingCost !== ''
          ? Number.parseInt(updateSubmissionDto.shippingCost, 10)
          : null,
      otherCost:
        updateSubmissionDto.otherCost && updateSubmissionDto.otherCost !== ''
          ? Number.parseInt(updateSubmissionDto.otherCost, 10)
          : null,
      discountType:
        updateSubmissionDto.discountType &&
        updateSubmissionDto.discountType !== ''
          ? updateSubmissionDto.discountType
          : null,
      deliveryDestination:
        updateSubmissionDto.deliveryDestination &&
        updateSubmissionDto.deliveryDestination !== ''
          ? updateSubmissionDto.deliveryDestination
          : null,
      deliveryNotes:
        updateSubmissionDto.deliveryNotes &&
        updateSubmissionDto.deliveryNotes !== ''
          ? updateSubmissionDto.deliveryNotes
          : null,
      submissionFileNotes:
        updateSubmissionDto.submissionFileNotes &&
        updateSubmissionDto.submissionFileNotes !== ''
          ? updateSubmissionDto.submissionFileNotes
          : null,
      generalNotes:
        updateSubmissionDto.generalNotes &&
        updateSubmissionDto.generalNotes !== ''
          ? updateSubmissionDto.generalNotes
          : null,
    }

    try {
      await this.submissionsService.update(id, validatedDto)
      return res.redirect(`/submissions/${id}`)
    } catch (error) {
      // バリデーションエラーまたはビジネスロジックエラーの処理
      if (
        error instanceof BadRequestException ||
        (error instanceof Error && error.message.includes('見つかりません'))
      ) {
        const submission = await this.submissionsService.findOne(id)
        const printingCompanies = await this.printingCompaniesService.findAll()

        return res.status(200).render('submissions/edit', {
          title: '入稿編集',
          submission: {
            id: id,
            printingCompanyId:
              updateSubmissionDto.printingCompanyId ||
              submission.printingCompany.id,
            status: updateSubmissionDto.status || submission.status,
            quantity: updateSubmissionDto.quantity || '',
            submissionDate: updateSubmissionDto.submissionDate || '',
            expectedDeliveryDate:
              updateSubmissionDto.expectedDeliveryDate || '',
            specificationNotes: updateSubmissionDto.specificationNotes || '',
            printingCost: updateSubmissionDto.printingCost || '',
            shippingCost: updateSubmissionDto.shippingCost || '',
            otherCost: updateSubmissionDto.otherCost || '',
            discountType: updateSubmissionDto.discountType || '',
            deliveryDestination: updateSubmissionDto.deliveryDestination || '',
            deliveryNotes: updateSubmissionDto.deliveryNotes || '',
            submissionFileNotes: updateSubmissionDto.submissionFileNotes || '',
            generalNotes: updateSubmissionDto.generalNotes || '',
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

  async remove(id: number, res: Response) {
    // 削除機能は Phase 2-2 で実装予定
    res.status(404).send('Not Found')
  }
}
