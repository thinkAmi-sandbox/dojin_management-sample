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
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { BooksService } from '../books/books.service'
import type { CreateEditionDto } from './dto/create-edition.dto'
import { UpdateEditionDto } from './dto/update-edition.dto'
import { EditionsService } from './editions.service'

@Controller('books/:bookId/editions')
export class EditionsController {
  constructor(
    private readonly editionsService: EditionsService,
    private readonly booksService: BooksService,
  ) {}

  @Get()
  @Render('editions/index')
  async findAllByBookId(@Param('bookId', ParseIntPipe) bookId: number) {
    // 書籍の存在確認
    const book = await this.booksService.findOne(bookId)
    const editions = await this.editionsService.findAllByBookId(bookId)

    return {
      title: `${book.title} - 版一覧`,
      book,
      editions: editions.map((edition) => ({
        id: edition.id,
        versionName: edition.versionName,
        versionNumber: edition.versionNumber,
        isbn: edition.isbn || '-',
        pageCount: edition.pageCount || '-',
        basePrice: edition.basePrice.toLocaleString('ja-JP') + '円',
        basePriceRaw: edition.basePrice,
        publishDate: edition.publishDate || '-',
        isActive: edition.isActive,
        isActiveText: edition.isActive ? '現行版' : '旧版',
        isSoldOut: edition.isSoldOut,
        isSoldOutText: edition.isSoldOut ? '完売' : '販売中',
        editionNotes: edition.editionNotes
          ? edition.editionNotes.length > 50
            ? edition.editionNotes.substring(0, 50) + '...'
            : edition.editionNotes
          : '',
      })),
    }
  }

  @Get('new')
  @Render('editions/new')
  async renderNewForm(@Param('bookId', ParseIntPipe) bookId: number) {
    // 書籍の存在確認
    const book = await this.booksService.findOne(bookId)

    return {
      title: `${book.title} - 新版作成`,
      book,
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  async create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() createEditionDto: CreateEditionDto,
    @Res() res: Response,
  ) {
    await this.editionsService.create(bookId, createEditionDto)
    res.redirect(`/books/${bookId}/editions`)
  }
}

@Controller('editions')
export class EditionDetailController {
  constructor(
    private readonly editionsService: EditionsService,
    private readonly booksService: BooksService,
  ) {}

  @Get(':id')
  @Render('editions/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const editionWithStock = await this.editionsService.findOneWithStock(id)
    const book = await this.booksService.findOne(editionWithStock.bookId)

    // 保管場所タイプの日本語変換
    const locationTypeMap: Record<string, string> = {
      home: '自宅',
      warehouse: '倉庫',
      consignment: '委託先',
      event: 'イベント会場',
    }

    return {
      title: `${book.title} - ${editionWithStock.versionName}`,
      book,
      edition: {
        id: editionWithStock.id,
        versionName: editionWithStock.versionName,
        versionNumber: editionWithStock.versionNumber,
        isbn: editionWithStock.isbn || '-',
        pageCount: editionWithStock.pageCount || '-',
        basePrice: editionWithStock.basePrice
          ? editionWithStock.basePrice.toLocaleString('ja-JP') + '円'
          : '-',
        basePriceRaw: editionWithStock.basePrice,
        printingCost: editionWithStock.printingCost
          ? editionWithStock.printingCost.toLocaleString('ja-JP') + '円'
          : '-',
        publishDate: editionWithStock.publishDate || '-',
        editionNotes: editionWithStock.editionNotes || '-',
        coverImageUrl: editionWithStock.coverImageUrl || '',
        isActive: editionWithStock.isActive,
        isActiveText: editionWithStock.isActive ? '現行版' : '旧版',
        isSoldOut: editionWithStock.isSoldOut,
        isSoldOutText: editionWithStock.isSoldOut ? '完売' : '販売中',
        createdAt: new Date(editionWithStock.createdAt).toLocaleDateString(
          'ja-JP',
        ),
        updatedAt: new Date(editionWithStock.updatedAt).toLocaleDateString(
          'ja-JP',
        ),
        // 在庫情報追加
        totalStock: editionWithStock.totalStock,
        totalReserved: editionWithStock.totalReserved,
        totalAvailable: editionWithStock.totalAvailable,
        stocksByLocation: editionWithStock.stocksByLocation.map((stock) => ({
          ...stock,
          locationTypeText:
            locationTypeMap[stock.locationType] || stock.locationType,
        })),
      },
      // URL生成
      editUrl: `/editions/${editionWithStock.id}/edit`,
      deleteUrl: `/editions/${editionWithStock.id}`,
      listUrl: `/books/${editionWithStock.bookId}/editions`,
      bookDetailUrl: `/books/${editionWithStock.bookId}`,
      // 在庫管理関連URL
      stockDetailUrl: `/stocks?editionId=${editionWithStock.id}`,
      stockMovementUrl: `/stock-movements?editionId=${editionWithStock.id}`,
    }
  }

  @Get(':id/edit')
  @Render('editions/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const edition = await this.editionsService.findOne(id)
    const book = await this.booksService.findOne(edition.bookId)

    return {
      title: `${book.title} - ${edition.versionName} 編集`,
      book,
      edition: {
        id: edition.id,
        versionName: edition.versionName,
        versionNumber: edition.versionNumber,
        isbn: edition.isbn || '',
        pageCount: edition.pageCount || '',
        basePrice: edition.basePrice,
        printingCost: edition.printingCost || '',
        publishDate: edition.publishDate || '',
        editionNotes: edition.editionNotes || '',
        coverImageUrl: edition.coverImageUrl || '',
        isActive: edition.isActive,
        isSoldOut: edition.isSoldOut,
      },
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateEditionDto,
      })
      await this.editionsService.update(id, validatedDto)
      return res.redirect(`/editions/${id}`)
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
    @Body() updateEditionDto: UpdateEditionDto,
    @Res() res: Response,
  ) {
    await this.editionsService.update(id, updateEditionDto)
    res.redirect(`/editions/${id}`)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const edition = await this.editionsService.findOne(id)
      await this.editionsService.remove(id)
      res.redirect(`/books/${edition.bookId}/editions`)
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('版が見つかりませんでした')
      }
      throw error
    }
  }
}
