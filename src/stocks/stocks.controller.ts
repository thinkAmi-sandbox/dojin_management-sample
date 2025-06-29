import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { CreateStockDto } from './dto/create-stock.dto'
import { UpdateStockDto } from './dto/update-stock.dto'
import { StocksService } from './stocks.service'

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  @Render('stocks/index')
  async findAll(
    @Query('editionId') editionId?: string,
    @Query('locationId') locationId?: string,
  ) {
    const filters: { editionId?: number; locationId?: number } = {}
    if (editionId) filters.editionId = Number.parseInt(editionId, 10)
    if (locationId) filters.locationId = Number.parseInt(locationId, 10)

    const stocks = await this.stocksService.findAll(filters)

    return {
      title: '在庫一覧',
      stocks: stocks.map((stock) => ({
        id: stock.id,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        availableQuantity: stock.availableQuantity,
        editionName: `${stock.bookTitle}（${stock.editionVersionName}）`,
        locationName: stock.locationName,
        notes: stock.notes
          ? stock.notes.length > 30
            ? stock.notes.substring(0, 30) + '...'
            : stock.notes
          : '',
        lastCheckedAt: stock.lastCheckedAt
          ? stock.lastCheckedAt.toLocaleDateString('ja-JP')
          : '未確認',
      })),
      filters: {
        editionId: editionId || '',
        locationId: locationId || '',
      },
    }
  }

  @Get('new')
  @Render('stocks/new')
  async renderNewForm() {
    // 版一覧と保管場所一覧を取得
    const editions = await this.stocksService.getEditionsForForm()
    const storageLocations =
      await this.stocksService.getStorageLocationsForForm()

    return {
      title: '新規在庫登録',
      breadcrumbs: [
        { name: '在庫一覧', url: '/stocks' },
        { name: '新規登録', url: null },
      ],
      editions,
      storageLocations,
    }
  }

  @Post()
  async create(@Body() createStockDto: CreateStockDto, @Res() res: Response) {
    try {
      await this.stocksService.create(createStockDto)
      return res.redirect('/stocks')
    } catch (error) {
      // 重複チェックエラーはBadRequestExceptionに変換
      if (
        error instanceof Error &&
        error.message.includes(
          'この版と保管場所の組み合わせの在庫は既に存在します',
        )
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: [error.message],
          error: 'Bad Request',
        })
      }
      // 数量バランスチェックエラーもBadRequestExceptionに変換
      if (
        error instanceof Error &&
        error.message.includes('在庫数量が不整合です')
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: [error.message],
          error: 'Bad Request',
        })
      }
      throw error
    }
  }

  @Get('check')
  @Render('stocks/check')
  async renderStockCheckForm() {
    const stocks = await this.stocksService.findAll()
    return {
      title: '棚卸し・在庫チェック',
      stocks: stocks.map((stock) => ({
        id: stock.id,
        editionName: `${stock.bookTitle}（${stock.editionVersionName}）`,
        locationName: stock.locationName,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        availableQuantity: stock.availableQuantity,
      })),
    }
  }

  @Get(':id/edit')
  @Render('stocks/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const stock = await this.stocksService.findOne(id)
    const editions = await this.stocksService.getEditionsForForm()
    const storageLocations =
      await this.stocksService.getStorageLocationsForForm()

    return {
      title: '在庫編集',
      stock,
      editions,
      storageLocations,
      breadcrumbs: [
        { name: '在庫一覧', url: '/stocks' },
        { name: '在庫詳細', url: `/stocks/${id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Get(':id')
  @Render('stocks/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const stock = await this.stocksService.findOne(id)

    return {
      title: '在庫詳細',
      stock: {
        id: stock.id,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        availableQuantity: stock.availableQuantity,
        editionName: `${stock.bookTitle}（${stock.editionVersionName}）`,
        locationName: stock.locationName,
        notes: stock.notes || '未設定',
        lastCheckedAt: stock.lastCheckedAt
          ? stock.lastCheckedAt.toLocaleDateString('ja-JP')
          : '未確認',
        createdAt: stock.createdAt.toLocaleDateString('ja-JP'),
        updatedAt: stock.updatedAt.toLocaleDateString('ja-JP'),
      },
      editUrl: `/stocks/${stock.id}/edit`,
      deleteUrl: `/stocks/${stock.id}`,
      listUrl: '/stocks',
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // ValidationPipeの手動実行
      const validationPipe = new ValidationPipe({
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateStockDto,
      })
      await this.stocksService.update(id, validatedDto)
      return res.redirect(`/stocks/${id}`)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.stocksService.remove(id)
      res.redirect('/stocks')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('在庫が見つかりませんでした')
      }
      throw error
    }
  }
}
