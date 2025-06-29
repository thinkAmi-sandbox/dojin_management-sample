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

    // 価格と数量をフォーマット
    const formatCurrency = (amount: number) => amount.toLocaleString('ja-JP')
    const formatQuantity = (quantity: number | null) =>
      quantity !== null ? `${quantity.toLocaleString('ja-JP')}冊` : '-'

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
        editionId: eb.editionId, // 版対応
        plannedQuantity: eb.plannedQuantity,
        actualQuantity: eb.actualQuantity,
        soldQuantity: eb.soldQuantity,
        remainingQuantity: eb.remainingQuantity,
        formattedPlannedQuantity: formatQuantity(eb.plannedQuantity),
        formattedActualQuantity: formatQuantity(eb.actualQuantity),
        formattedSoldQuantity: formatQuantity(eb.soldQuantity),
        formattedRemainingQuantity: formatQuantity(eb.remainingQuantity),
        price: eb.price,
        formattedPrice: `${formatCurrency(eb.price)}円`,
        displayOrder: eb.displayOrder,
        // 版情報
        edition: {
          id: eb.edition.id,
          versionName: eb.edition.versionName,
          basePrice: eb.edition.basePrice,
          formattedBasePrice: `${formatCurrency(eb.edition.basePrice)}円`,
          pageCount: eb.edition.pageCount,
        },
        // 書籍情報
        book: {
          id: eb.book.id,
          title: eb.book.title,
          subtitle: eb.book.subtitle || '',
        },
        editUrl: `/exhibits/${exhibitId}/books/${eb.editionId}/edit`,
        deleteUrl: `/exhibits/${exhibitId}/books/${eb.editionId}`,
      })),
      // 統計情報（版対応）
      stats: {
        totalEditions: exhibitBooks.length,
        totalPlannedQuantity: exhibitBooks.reduce(
          (sum, eb) => sum + eb.plannedQuantity,
          0,
        ),
        totalActualQuantity: exhibitBooks.reduce(
          (sum, eb) => sum + (eb.actualQuantity || 0),
          0,
        ),
        totalSoldQuantity: exhibitBooks.reduce(
          (sum, eb) => sum + (eb.soldQuantity || 0),
          0,
        ),
        totalRevenue: exhibitBooks.reduce(
          (sum, eb) => sum + (eb.soldQuantity || 0) * eb.price,
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
    const availableEditions =
      await this.exhibitBooksService.findAvailableEditions(exhibitId)

    // 価格フォーマット
    const formatCurrency = (amount: number) => amount.toLocaleString('ja-JP')

    return {
      title: '頒布書籍追加',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
      },
      editions: availableEditions.map((edition) => ({
        id: edition.id,
        versionName: edition.versionName,
        basePrice: edition.basePrice,
        formattedBasePrice: formatCurrency(edition.basePrice),
        pageCount: edition.pageCount,
        book: {
          id: edition.book.id,
          title: edition.book.title,
          subtitle: edition.book.subtitle || '',
        },
        displayText: `${edition.book.title} - ${edition.versionName} (定価: ${formatCurrency(edition.basePrice)}円)`,
      })),
      formData: {
        editionId: '',
        plannedQuantity: '',
        actualQuantity: '',
        soldQuantity: '',
        remainingQuantity: '',
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
    await this.exhibitBooksService.addEditionToExhibit(
      exhibitId,
      createExhibitBookDto,
    )
    res.redirect(`/exhibits/${exhibitId}/books`)
  }

  @Get(':editionId/edit')
  @Render('exhibit-books/edit')
  async renderEditForm(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('editionId', ParseIntPipe) editionId: number,
  ) {
    const exhibit = await this.exhibitBooksService.findExhibit(exhibitId)
    const exhibitBook = await this.exhibitBooksService.findExhibitBook(
      exhibitId,
      editionId,
    )
    const edition = await this.exhibitBooksService.findEdition(editionId)

    // フォーマット関数
    const formatCurrency = (amount: number) => amount.toLocaleString('ja-JP')

    return {
      title: '頒布情報編集',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
      },
      edition: {
        id: edition.id,
        versionName: edition.versionName,
        basePrice: edition.basePrice,
        formattedBasePrice: formatCurrency(edition.basePrice),
        pageCount: edition.pageCount,
      },
      formData: {
        plannedQuantity: exhibitBook.plannedQuantity.toString(),
        actualQuantity: exhibitBook.actualQuantity?.toString() || '',
        soldQuantity: exhibitBook.soldQuantity?.toString() || '',
        remainingQuantity: exhibitBook.remainingQuantity?.toString() || '',
        price: exhibitBook.price.toString(),
        displayOrder: exhibitBook.displayOrder.toString(),
      },
      errors: {},
      updateUrl: `/exhibits/${exhibitId}/books/${editionId}`,
      backUrl: `/exhibits/${exhibitId}/books`,
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '出展申込詳細', url: `/exhibits/${exhibitId}` },
        { name: '頒布書籍一覧', url: `/exhibits/${exhibitId}/books` },
        { name: '頒布情報編集', url: null },
      ],
    }
  }

  @Put(':editionId')
  async update(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('editionId', ParseIntPipe) editionId: number,
    @Body() updateExhibitBookDto: UpdateExhibitBookDto,
    @Res() res: Response,
  ) {
    await this.exhibitBooksService.updateExhibitBook(
      exhibitId,
      editionId,
      updateExhibitBookDto,
    )
    res.redirect(`/exhibits/${exhibitId}/books`)
  }

  @Post(':editionId')
  async updateViaPost(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('editionId', ParseIntPipe) editionId: number,
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
        editionId,
        validatedDto,
      )
      res.redirect(`/exhibits/${exhibitId}/books`)
    } else if (body._method === 'DELETE') {
      return this.remove(exhibitId, editionId, res)
    } else {
      res.status(400).send('無効なリクエストです')
    }
  }

  @Delete(':editionId')
  async remove(
    @Param('exhibitId', ParseIntPipe) exhibitId: number,
    @Param('editionId', ParseIntPipe) editionId: number,
    @Res() res: Response,
  ) {
    try {
      await this.exhibitBooksService.removeEditionFromExhibit(
        exhibitId,
        editionId,
      )
      res.redirect(`/exhibits/${exhibitId}/books`)
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('頒布版が見つかりませんでした')
      }
      throw error
    }
  }
}
