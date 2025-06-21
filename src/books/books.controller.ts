import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'
import { CreateSubmissionDto } from '../submissions/dto/create-submission.dto'
import { SubmissionsService } from '../submissions/submissions.service'
import { BooksService } from './books.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookStatusDto } from './dto/update-book-status.dto'
import { UpdateBookDto } from './dto/update-book.dto'
import { BooksListView } from './views/books-list.view'

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly booksListView: BooksListView,
    private readonly submissionsService: SubmissionsService,
    private readonly printingCompaniesService: PrintingCompaniesService,
  ) {}

  @Get()
  @Render('books/index')
  async findAll() {
    const books = await this.booksService.findAll()
    return this.booksListView.render(books)
  }

  @Get('new')
  @Render('books/new')
  renderNewForm() {
    return {
      title: '新規書籍作成',
      book: {
        title: '',
        subtitle: '',
        description: '',
        pageCount: '',
      },
      errors: {},
    }
  }

  @Get(':id/edit')
  @Render('books/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const book = await this.booksService.findOne(id)

    return {
      title: '書籍編集',
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
        description: book.description || '',
        pageCount: book.pageCount || '',
      },
      errors: {},
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Get(':id')
  @Render('books/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const book = await this.booksService.findOne(id)

    const getStatusLabel = (status: string) => {
      const statusMap: { [key: string]: string } = {
        planning: '企画中',
        writing: '執筆中',
        editing: '校正中',
        completed: '完成',
      }
      return statusMap[status] || status
    }

    return {
      title: '書籍詳細',
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
        description: book.description || '説明なし',
        pageCount: book.pageCount
          ? `${book.pageCount}ページ`
          : 'ページ数未設定',
        status: book.status,
        statusLabel: getStatusLabel(book.status),
        formattedCreatedAt: book.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: book.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/books/${book.id}/edit`,
        statusEditUrl: `/books/${book.id}/status/edit`,
      },
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: null },
      ],
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/books')
  async create(@Body() createBookDto: CreateBookDto) {
    await this.booksService.create(createBookDto)
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // タイトルが空文字列の場合、バリデーションエラーとして処理
      if (
        body.title === '' ||
        (body.title &&
          typeof body.title === 'string' &&
          body.title.trim() === '')
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: ['タイトルは必須です'],
          error: 'Bad Request',
        })
      }

      // ValidationPipeを手動で適用
      const validationPipe = new ValidationPipe()
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateBookDto,
      })
      await this.booksService.update(id, validatedDto)
      res.redirect(`/books/${id}`)
    } else if (body._method === 'DELETE') {
      return this.removeViaPost(id, res)
    } else {
      res.status(404).send('Not Found')
    }
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  @Redirect()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    await this.booksService.update(id, updateBookDto)
    return { url: `/books/${id}` }
  }

  @Delete(':id')
  @Redirect('/books')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.booksService.remove(id)
  }

  async removeViaPost(id: number, res: Response) {
    await this.booksService.remove(id)
    res.redirect('/books')
  }

  @Get(':bookId/status/edit')
  @Render('books/status-edit')
  async renderStatusEditForm(@Param('bookId', ParseIntPipe) bookId: number) {
    const book = await this.booksService.findOne(bookId)

    const statusOptions = [
      { value: 'planning', label: '企画中' },
      { value: 'writing', label: '執筆中' },
      { value: 'editing', label: '校正中' },
      { value: 'completed', label: '完成' },
    ]

    return {
      title: 'ステータス変更',
      book: {
        id: book.id,
        title: book.title,
        status: book.status,
      },
      statusOptions,
      errors: {},
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: 'ステータス変更', url: null },
      ],
    }
  }

  @Post(':bookId/status')
  async updateStatusViaPost(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // ValidationPipeを手動で適用
      const validationPipe = new ValidationPipe()
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateBookStatusDto,
      })
      await this.booksService.updateStatus(bookId, validatedDto)
      res.redirect(`/books/${bookId}`)
    } else {
      res.status(404).send('Not Found')
    }
  }

  @Put(':bookId/status')
  @UsePipes(ValidationPipe)
  @Redirect()
  async updateStatus(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() updateBookStatusDto: UpdateBookStatusDto,
  ) {
    await this.booksService.updateStatus(bookId, updateBookStatusDto)
    return { url: `/books/${bookId}` }
  }

  @Get(':bookId/submissions')
  @Render('submissions/book-index')
  async findSubmissionsByBook(@Param('bookId', ParseIntPipe) bookId: number) {
    try {
      const result = await this.submissionsService.findByBook(bookId)

      // ステータスの日本語変換
      const statusMap = {
        draft: '準備中',
        submitted: '入稿済み',
        printing: '印刷中',
        delivered: '納品済み',
        cancelled: 'キャンセル',
      }

      return {
        title: `${result.book.title}の入稿履歴`,
        book: result.book,
        submissions: result.submissions.map((submission) => ({
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
    } catch (error) {
      if (error instanceof Error && error.message === 'Book not found') {
        throw new NotFoundException('指定された書籍が見つかりません')
      }
      throw error
    }
  }

  @Get(':bookId/submissions/new')
  @Render('submissions/new')
  async renderNewSubmissionForm(@Param('bookId', ParseIntPipe) bookId: number) {
    try {
      const book = await this.booksService.findOne(bookId)
      const printingCompanies = await this.printingCompaniesService.findAll()

      return {
        title: '入稿作成',
        book,
        printingCompanies,
        submission: {
          printingCompanyId: '',
          quantity: '',
          submissionDate: '',
          expectedDeliveryDate: '',
          specificationNotes: '',
          printingCost: '',
          shippingCost: '',
          otherCost: '',
          discountType: '',
          deliveryDestination: '',
          deliveryNotes: '',
          submissionFileNotes: '',
          generalNotes: '',
        },
        errors: {},
      }
    } catch (_error) {
      throw new NotFoundException('書籍が見つかりません')
    }
  }

  @Post(':bookId/submissions')
  @UsePipes(ValidationPipe)
  async createSubmission(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @Res() res: Response,
  ) {
    try {
      const book = await this.booksService.findOne(bookId)

      try {
        await this.submissionsService.create(bookId, createSubmissionDto)
        res.redirect(`/books/${bookId}/submissions`)
      } catch (error) {
        if (error instanceof BadRequestException) {
          const printingCompanies =
            await this.printingCompaniesService.findAll()

          return res.status(400).render('submissions/new', {
            title: '入稿作成',
            book,
            printingCompanies,
            submission: createSubmissionDto,
            errors: { general: error.message },
          })
        }
        throw error
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('書籍が見つかりません')
      }
      throw error
    }
  }
}
