import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Redirect,
  Render,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { BooksService } from './books.service'
import { CreateBookDto } from './dto/create-book.dto'
import { UpdateBookDto } from './dto/update-book.dto'
import { UpdateBookStatusDto } from './dto/update-book-status.dto'
import { BooksListView } from './views/books-list.view'

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly booksListView: BooksListView,
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
        formattedCreatedAt: book.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: book.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/books/${book.id}/edit`,
      },
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: null },
      ],
    }
  }

  @Post()
  @Redirect('/books')
  async create(@Body() createBookDto: CreateBookDto) {
    await this.booksService.create(createBookDto)
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
      return this.removeViaPost(id, res)
    }

    res.status(404).send('Not Found')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
    @Res() res: Response,
  ) {
    if (!updateBookDto.title || updateBookDto.title.trim() === '') {
      const book = await this.booksService.findOne(id)

      return res.status(200).render('books/edit', {
        title: '書籍編集',
        book: {
          id: book.id,
          title: updateBookDto.title || book.title,
          subtitle: updateBookDto.subtitle || book.subtitle || '',
          description: updateBookDto.description || book.description || '',
          pageCount: updateBookDto.pageCount || book.pageCount || '',
        },
        errors: { title: 'タイトルは必須です' },
        breadcrumbs: [
          { name: '書籍一覧', url: '/books' },
          { name: book.title, url: `/books/${book.id}` },
          { name: '編集', url: null },
        ],
      })
    }

    await this.booksService.update(id, updateBookDto)
    res.redirect(`/books/${id}`)
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
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      return this.updateStatus(bookId, body, res)
    }

    res.status(404).send('Not Found')
  }

  @Put(':bookId/status')
  async updateStatus(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() updateBookStatusDto: UpdateBookStatusDto,
    @Res() res: Response,
  ) {
    if (!updateBookStatusDto.status) {
      const book = await this.booksService.findOne(bookId)
      const statusOptions = [
        { value: 'planning', label: '企画中' },
        { value: 'writing', label: '執筆中' },
        { value: 'editing', label: '校正中' },
        { value: 'completed', label: '完成' },
      ]

      return res.status(200).render('books/status-edit', {
        title: 'ステータス変更',
        book: {
          id: book.id,
          title: book.title,
          status: book.status,
        },
        statusOptions,
        errors: { status: 'ステータスは必須です' },
        breadcrumbs: [
          { name: '書籍一覧', url: '/books' },
          { name: book.title, url: `/books/${book.id}` },
          { name: 'ステータス変更', url: null },
        ],
      })
    }

    const validStatuses = ['planning', 'writing', 'editing', 'completed']
    if (!validStatuses.includes(updateBookStatusDto.status)) {
      const book = await this.booksService.findOne(bookId)
      const statusOptions = [
        { value: 'planning', label: '企画中' },
        { value: 'writing', label: '執筆中' },
        { value: 'editing', label: '校正中' },
        { value: 'completed', label: '完成' },
      ]

      return res.status(200).render('books/status-edit', {
        title: 'ステータス変更',
        book: {
          id: book.id,
          title: book.title,
          status: book.status,
        },
        statusOptions,
        errors: { status: '有効なステータスを選択してください' },
        breadcrumbs: [
          { name: '書籍一覧', url: '/books' },
          { name: book.title, url: `/books/${book.id}` },
          { name: 'ステータス変更', url: null },
        ],
      })
    }

    await this.booksService.updateStatus(bookId, updateBookStatusDto)
    res.redirect(`/books/${bookId}`)
  }
}
