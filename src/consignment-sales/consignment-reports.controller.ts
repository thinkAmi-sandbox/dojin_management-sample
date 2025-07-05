import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ConsignmentsService } from '../consignments/consignments.service'
import { EditionsService } from '../editions/editions.service'
import { ConsignmentSalesService } from './consignment-sales.service'
import { AdjustConsignmentSalesDto } from './dto/adjust-consignment-sales.dto'
import { ConfirmConsignmentSalesDto } from './dto/confirm-consignment-sales.dto'
import { CreateConsignmentSalesDto } from './dto/create-consignment-sales.dto'
import { SettleConsignmentSalesDto } from './dto/settle-consignment-sales.dto'

@Controller('consignments/:consignmentId/reports')
export class ConsignmentReportsController {
  constructor(
    private readonly consignmentSalesService: ConsignmentSalesService,
    private readonly consignmentsService: ConsignmentsService,
    private readonly editionsService: EditionsService,
  ) {}

  @Get()
  @Render('consignment-reports/index')
  async findAll(@Param('consignmentId', ParseIntPipe) consignmentId: number) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const salesReports =
      await this.consignmentSalesService.findByConsignmentId(consignmentId)

    // 精算サマリー計算
    const settlementSummary = {
      totalSalesAmount: salesReports.reduce(
        (sum, report) => sum + report.totalSalesAmount,
        0,
      ),
      settledAmount: salesReports
        .filter((report) => report.status === 'settled')
        .reduce((sum, report) => sum + report.netAmount, 0),
      unsettledAmount: salesReports
        .filter((report) => report.status !== 'settled')
        .reduce((sum, report) => sum + report.netAmount, 0),
    }

    return {
      title: `${consignment.storeName} - 販売報告一覧`,
      consignment,
      salesReports,
      settlementSummary,
    }
  }

  @Get('new')
  @Render('consignment-reports/new')
  async renderNewForm(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
  ) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const availableEditions = await this.editionsService.findByLocation(
      consignment.locationId,
    )

    return {
      title: `${consignment.storeName} - 新規販売報告`,
      consignment,
      availableEditions,
      formData: {},
      errors: {},
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async create(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Body() reportSalesDto: CreateConsignmentSalesDto,
  ) {
    reportSalesDto.consignmentId = consignmentId
    await this.consignmentSalesService.reportSales(reportSalesDto)
    return { url: `/consignments/${consignmentId}/reports` }
  }

  @Get(':id')
  @Render('consignment-reports/show')
  async findOne(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const consignment = await this.consignmentsService.findOne(consignmentId)
    const salesReport =
      await this.consignmentSalesService.findOneWithDetails(id)

    // ステータスの日本語変換
    const statusMap = {
      reported: '報告済み',
      confirmed: '確認済み',
      adjusted: '調整済み',
      settled: '精算済み',
    }

    return {
      title: `販売報告詳細 - ${consignment.storeName}`,
      consignment,
      salesReport: {
        ...salesReport,
        statusText: statusMap[salesReport.status] || salesReport.status,
      },
    }
  }

  @Post(':id/confirm')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async confirm(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDto: ConfirmConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.confirmSales(id, confirmDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }

  @Post(':id/adjust')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async adjust(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() adjustDto: AdjustConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.adjustSales(id, adjustDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }

  @Post(':id/settle')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async settle(
    @Param('consignmentId', ParseIntPipe) consignmentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() settleDto: SettleConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.settleSales(id, settleDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }
}
