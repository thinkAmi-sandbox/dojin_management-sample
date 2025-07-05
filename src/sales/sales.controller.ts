import {
  Body,
  Controller,
  Get,
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
import { plainToInstance } from 'class-transformer'
import type { Response } from 'express'
import {
  CreateSalesTransactionDto,
  SalesReportFilters,
  UpdateSalesTransactionDto,
} from './dto'
import { SalesReportService } from './sales-report.service'
import { SalesService } from './sales.service'

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly salesReportService: SalesReportService,
  ) {}

  @Get()
  @Render('sales/index')
  async findAll(@Query() filters: Record<string, unknown>) {
    const salesTransactions =
      await this.salesService.findAllSalesTransactions(filters)

    return {
      title: '販売記録一覧',
      salesTransactions,
      filters,
    }
  }

  @Get('new')
  @Render('sales/new')
  renderNewForm() {
    // TODO: editionsService, eventsService, storageLocationsService の実装後に追加

    return {
      title: '新規販売登録',
      availableEditions: [],
      events: [],
      locations: [],
      formData: {},
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/sales')
  async create(@Body() createSalesTransactionDto: CreateSalesTransactionDto) {
    await this.salesService.createSalesTransaction(createSalesTransactionDto)
  }

  @Get('reports')
  @Render('sales/reports')
  async showReports(@Query() query: Record<string, unknown>) {
    try {
      // 手動でDTOに変換（ValidationPipeを回避）
      const filters = plainToInstance(SalesReportFilters, query)
      const reportData =
        await this.salesReportService.generateSalesReport(filters)

      return {
        title: '売上レポート',
        reportData,
        filters,
        breadcrumbs: [
          { label: 'ホーム', url: '/' },
          { label: '販売記録一覧', url: '/sales' },
          { label: 'レポート', url: null },
        ],
      }
    } catch {
      // バリデーションエラーの場合でも、空のレポートを表示
      return {
        title: '売上レポート',
        reportData: {
          summary: {
            totalTransactions: 0,
            totalQuantity: 0,
            totalAmount: 0,
            averageTransactionAmount: 0,
          },
          byEdition: [],
          byPeriod: [],
          byChannel: [],
          byEvent: [],
        },
        filters: query || {},
        breadcrumbs: [
          { label: 'ホーム', url: '/' },
          { label: '販売記録一覧', url: '/sales' },
          { label: 'レポート', url: null },
        ],
      }
    }
  }

  @Get(':id')
  @Render('sales/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const salesTransaction = await this.salesService.findOneWithDetails(id)

    return {
      title: '販売記録詳細',
      salesTransaction,
      breadcrumbs: [
        { label: 'ホーム', url: '/' },
        { label: '販売記録一覧', url: '/sales' },
        { label: '詳細', url: null },
      ],
    }
  }

  @Get(':id/edit')
  @Render('sales/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const salesTransaction = await this.salesService.findOneWithDetails(id)

    return {
      title: '販売記録編集',
      salesTransaction,
      events: [], // TODO: eventsService実装後に取得
      locations: [], // TODO: storageLocationsService実装後に取得
      breadcrumbs: [
        { label: 'ホーム', url: '/' },
        { label: '販売記録一覧', url: '/sales' },
        { label: '詳細', url: `/sales/${id}` },
        { label: '編集', url: null },
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
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateSalesTransactionDto,
      })
      await this.salesService.update(id, validatedDto)
      return res.redirect(`/sales/${id}`)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  async remove(id: number, res: Response) {
    try {
      if (id <= 0 || Number.isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.salesService.remove(id)
      res.redirect('/sales')
    } catch (error) {
      if (error instanceof Error && error.message.includes('見つかりません')) {
        return res.status(404).send('販売記録が見つかりませんでした')
      }
      throw error
    }
  }
}
