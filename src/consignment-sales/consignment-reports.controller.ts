import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { ConsignmentsService } from '../consignments/consignments.service'
import { EditionsService } from '../editions/editions.service'
import { ConsignmentSalesService } from './consignment-sales.service'
import { AdjustConsignmentSalesDto } from './dto/adjust-consignment-sales.dto'
import { BulkSettleConsignmentSalesDto } from './dto/bulk-settle-consignment-sales.dto'
import { ConfirmConsignmentSalesDto } from './dto/confirm-consignment-sales.dto'
import { CreateConsignmentSalesDto } from './dto/create-consignment-sales.dto'
import { SettleConsignmentSalesDto } from './dto/settle-consignment-sales.dto'

@Controller('consignments')
export class ConsignmentReportsController {
  constructor(
    private readonly consignmentSalesService: ConsignmentSalesService,
    private readonly consignmentsService: ConsignmentsService,
    private readonly editionsService: EditionsService,
  ) {}

  @Get(':consignmentId/reports')
  @Render('consignment-reports/index')
  async findAll(@Param('consignmentId') consignmentId: string) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const consignment = await this.consignmentsService.findOne(consignmentIdNum)
    const salesReports =
      await this.consignmentSalesService.findByConsignmentId(consignmentIdNum)

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

  @Get(':consignmentId/reports/new')
  @Render('consignment-reports/new')
  async renderNewForm(
    @Param('consignmentId') consignmentId: number,
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

  @Post(':consignmentId/reports')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async create(
    @Param('consignmentId') consignmentId: number,
    @Body() reportSalesDto: CreateConsignmentSalesDto,
  ) {
    reportSalesDto.consignmentId = consignmentId
    await this.consignmentSalesService.reportSales(reportSalesDto)
    return { url: `/consignments/${consignmentId}/reports` }
  }

  @Get(':consignmentId/reports/:id')
  @Render('consignment-reports/show')
  async findOne(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
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

  @Post(':consignmentId/reports/:id/confirm')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async confirm(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Body() confirmDto: ConfirmConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.confirmSales(id, confirmDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }

  @Post(':consignmentId/reports/:id/adjust')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async adjust(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Body() adjustDto: AdjustConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.adjustSales(id, adjustDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }

  @Post(':consignmentId/reports/:id/settle')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async settle(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Body() settleDto: SettleConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.settleSales(id, settleDto)
    return { url: `/consignments/${consignmentId}/reports/${id}` }
  }

  // 一括精算
  @Post(':consignmentId/reports/bulk-settle')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async bulkSettle(
    @Param('consignmentId') consignmentId: number,
    @Body() bulkSettleDto: BulkSettleConsignmentSalesDto,
  ) {
    await this.consignmentSalesService.bulkSettle(
      consignmentId,
      new Date(bulkSettleDto.periodStart),
      new Date(bulkSettleDto.periodEnd),
      bulkSettleDto.settlementMethod,
      bulkSettleDto.notes,
    )
    return { url: `/consignments/${consignmentId}/reports` }
  }

  // 月次精算サマリー
  @Get(':consignmentId/reports/monthly-summary')
  async getMonthlySummary(
    @Param('consignmentId') consignmentId: string,
    @Query() query: { year: string; month: string },
  ) {
    console.log('getMonthlySummary called with:', { consignmentId, query })
    const consignmentIdNum = parseInt(consignmentId, 10)
    const year = parseInt(query.year, 10)
    const month = parseInt(query.month, 10)
    
    console.log('Parsed values:', { consignmentIdNum, year, month })
    
    if (isNaN(consignmentIdNum) || isNaN(year) || isNaN(month)) {
      throw new BadRequestException('Invalid parameters')
    }
    
    try {
      const result = await this.consignmentSalesService.getMonthlySummary(
        consignmentIdNum,
        year,
        month,
      )
      console.log('Service result:', result)
      return result
    } catch (error) {
      console.error('Error in getMonthlySummary:', error)
      throw error
    }
  }

  // 四半期別精算レポート
  @Get(':consignmentId/reports/quarterly-summary')
  async getQuarterlySummary(
    @Param('consignmentId') consignmentId: string,
    @Query() query: { year: string; quarter: string },
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const year = parseInt(query.year, 10)
    const quarter = parseInt(query.quarter, 10)
    
    if (isNaN(consignmentIdNum) || isNaN(year) || isNaN(quarter)) {
      throw new BadRequestException('Invalid parameters')
    }
    
    return await this.consignmentSalesService.getQuarterlySummary(
      consignmentIdNum,
      year,
      quarter,
    )
  }

  // CSVエクスポート
  @Get(':consignmentId/reports/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="settlement-report.csv"')
  async exportCsv(
    @Param('consignmentId') consignmentId: string,
    @Query() query: { format: string; periodStart: string; periodEnd: string },
    @Res() res: Response,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    
    if (isNaN(consignmentIdNum)) {
      throw new BadRequestException('Invalid consignment ID')
    }
    
    const data = await this.consignmentSalesService.getExportData(
      consignmentIdNum,
      new Date(query.periodStart),
      new Date(query.periodEnd),
    )

    // CSV生成（簡易版）
    const headers = Object.keys(data[0] || {})
    const csvData = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => row[h]).join(',')),
    ].join('\n')

    res.send(csvData)
  }

  // 精算明細書PDF生成（仮実装）
  @Get(':consignmentId/reports/:id/statement')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="settlement-statement.pdf"',
  )
  async generateStatement(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Res() res: Response,
  ) {
    // PDF生成は実際にはPDFライブラリを使用しますが、ここでは仮実装
    res.send('PDF content would be generated here')
  }

  // 精算明細書メール送信（仮実装）
  @Post(':consignmentId/reports/:id/send-statement')
  async sendStatement(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Body() body: { email: string; subject: string; message: string },
  ) {
    // メール送信は実際にはメールサービスを使用しますが、ここでは仮実装
    return {
      success: true,
      message: '精算明細書を送信しました',
    }
  }

  // 支払予定登録（仮実装）
  @Post(':consignmentId/reports/:id/payment-schedule')
  async createPaymentSchedule(
    @Param('consignmentId') consignmentId: number,
    @Param('id') id: number,
    @Body() body: {
      scheduledDate: string
      amount: number
      paymentMethod: string
      notes?: string
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    // 支払予定管理は将来的に実装
    res.status(201)
    return {
      id: 1,
      consignmentSalesId: id,
      scheduledDate: body.scheduledDate,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      status: 'scheduled',
    }
  }

  // 支払完了記録（仮実装）
  @Post(':consignmentId/reports/payment-schedules/:scheduleId/complete')
  async completePayment(
    @Param('consignmentId') consignmentId: number,
    @Param('scheduleId') scheduleId: number,
    @Body() body: {
      actualDate: string
      actualAmount: number
      transactionReference: string
      notes?: string
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    // 支払完了記録は将来的に実装
    res.status(201)
    return {
      id: scheduleId,
      consignmentSalesId: 1,
      scheduledDate: body.actualDate,
      actualDate: body.actualDate,
      actualAmount: body.actualAmount,
      transactionReference: body.transactionReference,
      notes: body.notes,
      status: 'completed',
    }
  }

  // 未精算レポート通知（仮実装）
  @Post(':consignmentId/reports/send-reminder')
  async sendReminder(
    @Param('consignmentId') consignmentId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 通知機能は将来的に実装
    res.status(201)
    return {
      remindersSent: 1,
      message: '未精算レポートの通知を送信しました',
    }
  }

  // 精算期限アラート設定（仮実装）
  @Post(':consignmentId/reports/settlement-alerts')
  async createSettlementAlerts(
    @Param('consignmentId') consignmentId: number,
    @Body() body: { alertDays: number[]; enabled: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    // アラート機能は将来的に実装
    res.status(201)
    return {
      consignmentId,
      alertDays: body.alertDays,
      enabled: body.enabled,
    }
  }
}
