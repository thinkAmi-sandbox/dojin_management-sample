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
import type { Response } from 'express'
import { SalesService } from './sales.service'

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Render('sales/index')
  async findAll(@Query() filters: any) {
    const salesTransactions = await this.salesService.findAllSalesTransactions(
      filters,
    )

    return {
      title: '販売記録一覧',
      salesTransactions,
      filters,
    }
  }

  @Get('new')
  @Render('sales/new')
  async renderNewForm() {
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
  async create(@Body() createSalesTransactionDto: any) {
    await this.salesService.createSalesTransaction(createSalesTransactionDto)
  }

  @Get(':id')
  @Render('sales/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const salesTransaction = await this.salesService.findOneWithDetails(id)

    return {
      title: '販売記録詳細',
      salesTransaction,
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // TODO: UpdateSalesTransactionDto の実装後に追加
      // const validationPipe = new ValidationPipe({ transform: true })
      // const validatedDto = await validationPipe.transform(body, {
      //   type: 'body',
      //   metatype: UpdateSalesTransactionDto,
      // })
      // await this.salesService.update(id, validatedDto)
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