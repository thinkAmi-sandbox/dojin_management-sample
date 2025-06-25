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
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { CreateExhibitBookDto } from './dto/create-exhibit-book.dto'
import { UpdateExhibitBookDto } from './dto/update-exhibit-book.dto'
import { ExhibitBooksService } from './exhibit-books.service'

@Controller('exhibits/:exhibitId/books')
export class ExhibitBooksController {
  constructor(private readonly exhibitBooksService: ExhibitBooksService) {}

  @Get()
  @Render('exhibit-books/index')
  async findAll(@Param('exhibitId', ParseIntPipe) exhibitId: number) {
    const exhibit = await this.exhibitBooksService.findExhibit(exhibitId)
    const exhibitBooks =
      await this.exhibitBooksService.findExhibitBooks(exhibitId)

    // 価格と頒布予定数をフォーマット
    const formatCurrency = (amount: number) => amount.toLocaleString('ja-JP')

    return {
      title: '頒布書籍一覧',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
      },
      exhibitBooks: exhibitBooks.map((eb) => ({
        exhibitId: eb.exhibitId,
        bookId: eb.bookId,
        plannedQuantity: eb.plannedQuantity,
        formattedPlannedQuantity: `${eb.plannedQuantity.toLocaleString('ja-JP')}冊`,
        price: eb.price,
        formattedPrice: `${formatCurrency(eb.price)}円`,
        displayOrder: eb.displayOrder,
        book: {
          id: eb.book.id,
          title: eb.book.title,
          subtitle: eb.book.subtitle || '',
        },
        editUrl: `/exhibits/${exhibitId}/books/${eb.bookId}/edit`,
        deleteUrl: `/exhibits/${exhibitId}/books/${eb.bookId}`,
      })),
      // 統計情報
      stats: {
        totalBooks: exhibitBooks.length,
        totalQuantity: exhibitBooks.reduce(
          (sum, eb) => sum + eb.plannedQuantity,
          0,
        ),
        totalRevenue: exhibitBooks.reduce(
          (sum, eb) => sum + eb.plannedQuantity * eb.price,
          0,
        ),
      },
      // URL生成
      addUrl: `/exhibits/${exhibitId}/books/add`,
      backUrl: `/exhibits/${exhibitId}`,
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
        { name: '頒布書籍一覧', url: null },
      ],
    }
  }

  @Get('add')
  @Render('exhibit-books/add')
  async renderAddForm(@Param('exhibitId', ParseIntPipe) exhibitId: number) {
    const exhibit = await this.exhibitBooksService.findExhibit(exhibitId)
    const availableBooks =
      await this.exhibitBooksService.findAvailableBooks(exhibitId)

    return {
      title: '頒布書籍追加',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
      },
      books: availableBooks.map((book) => ({
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
      })),
      formData: {
        bookId: '',
        plannedQuantity: '',
        price: '',
        displayOrder: '',
      },
      errors: {},
      backUrl: `/exhibits/${exhibitId}/books`,
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
        { name: '頒布書籍一覧', url: `/exhibits/${exhibitId}/books` },
        { name: '頒布書籍追加', url: null },
      ],
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Body() createExhibitBookDto: CreateExhibitBookDto,
    @Res() res: Response,
  ) {
    await this.exhibitBooksService.addBookToExhibit(
      exhibitId,
      createExhibitBookDto,
    )
    res.redirect(`/exhibits/${exhibitId}/books`)
  }

  @Get(':bookId/edit')
  @Render('exhibit-books/edit')
  async renderEditForm(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    const exhibit = await this.exhibitBooksService.findExhibit(exhibitId)
    const exhibitBook = await this.exhibitBooksService.findExhibitBook(
      exhibitId,
      bookId,
    )
    const book = await this.exhibitBooksService.findBook(bookId)

    return {
      title: '頒布情報編集',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
      },
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || '',
      },
      formData: {
        plannedQuantity: exhibitBook.plannedQuantity.toString(),
        price: exhibitBook.price.toString(),
        displayOrder: exhibitBook.displayOrder.toString(),
      },
      errors: {},
      updateUrl: `/exhibits/${exhibitId}/books/${bookId}`,
      backUrl: `/exhibits/${exhibitId}/books`,
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
        { name: '頒布書籍一覧', url: `/exhibits/${exhibitId}/books` },
        { name: '頒布情報編集', url: null },
      ],
    }
  }

  @Put(':bookId')
  async update(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() updateExhibitBookDto: UpdateExhibitBookDto,
    @Res() res: Response,
  ) {
    await this.exhibitBooksService.updateExhibitBook(
      exhibitId,
      bookId,
      updateExhibitBookDto,
    )
    res.redirect(`/exhibits/${exhibitId}/books`)
  }

  @Post(':bookId')
  async updateViaPost(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe()
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateExhibitBookDto,
      })
      await this.exhibitBooksService.updateExhibitBook(
        exhibitId,
        bookId,
        validatedDto,
      )
      res.redirect(`/exhibits/${exhibitId}/books`)
    } else if (body._method === 'DELETE') {
      return this.remove(exhibitId, bookId, res)
    } else {
      res.status(400).send('無効なリクエストです')
    }
  }

  @Delete(':bookId')
  async remove(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Res() res: Response,
  ) {
    try {
      await this.exhibitBooksService.removeBookFromExhibit(exhibitId, bookId)
      res.redirect(`/exhibits/${exhibitId}/books`)
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('頒布書籍が見つかりませんでした')
      }
      throw error
    }
  }
}
