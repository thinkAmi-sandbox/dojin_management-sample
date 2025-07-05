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

@Controller('consignments/:consignmentId/reports')
export class ConsignmentReportsController {
  constructor(
    private readonly consignmentSalesService: ConsignmentSalesService,
    private readonly consignmentsService: ConsignmentsService,
    private readonly editionsService: EditionsService,
  ) {}

  // テスト用エンドポイント
  @Get('test')
  async test() {
    return { message: 'Test endpoint works' }
  }

  @Get()
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

  @Get('new')
  @Render('consignment-reports/new')
  async renderNewForm(@Param('consignmentId') consignmentId: string) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const consignment = await this.consignmentsService.findOne(consignmentIdNum)
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

  // 月次精算サマリー（:idより前に移動）
  @Get('monthly-summary')
  async getMonthlySummary(
    @Param('consignmentId') consignmentId: string,
    @Query() query: { year: string; month: string },
    @Res() res: Response,
  ) {
    try {
      const consignmentIdNum = parseInt(consignmentId, 10)
      const year = parseInt(query.year, 10)
      const month = parseInt(query.month, 10)

      if (isNaN(consignmentIdNum) || isNaN(year) || isNaN(month)) {
        throw new BadRequestException('Invalid parameters')
      }

      const result = await this.consignmentSalesService.getMonthlySummary(
        consignmentIdNum,
        year,
        month,
      )

      res.json(result)
    } catch (error) {
      console.error('[Controller] Monthly summary error:', error)
      console.error('[Controller] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      })
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message || 'Unknown error',
        details:
          process.env.NODE_ENV !== 'production'
            ? {
                name: error.name,
                code: error.code,
                stack: error.stack,
              }
            : undefined,
      })
    }
  }

  // 四半期別精算レポート（:idより前に移動）
  @Get('quarterly-summary')
  async getQuarterlySummary(
    @Param('consignmentId') consignmentId: string,
    @Query() query: { year: string; quarter: string },
    @Res() res: Response,
  ) {
    try {
      const consignmentIdNum = parseInt(consignmentId, 10)
      const year = parseInt(query.year, 10)
      const quarter = parseInt(query.quarter, 10)

      if (isNaN(consignmentIdNum) || isNaN(year) || isNaN(quarter)) {
        throw new BadRequestException('Invalid parameters')
      }

      const result = await this.consignmentSalesService.getQuarterlySummary(
        consignmentIdNum,
        year,
        quarter,
      )

      res.json(result)
    } catch (error) {
      console.error('Quarterly summary error:', error)
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      })
    }
  }

  // CSVエクスポート（:idより前に移動）
  @Get('export')
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

    try {
      const data = await this.consignmentSalesService.getExportData(
        consignmentIdNum,
        new Date(query.periodStart),
        new Date(query.periodEnd),
      )

      // CSV生成（簡易版）
      if (!data || data.length === 0) {
        res.send(
          '報告期間,売上金額,手数料,純額,ステータス,報告日,精算日,精算方法\n',
        )
        return
      }

      const headers = Object.keys(data[0])
      const csvData = [
        headers.join(','),
        ...data.map((row) => headers.map((h) => row[h]).join(',')),
      ].join('\n')

      res.send(csvData)
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        statusCode: 500,
      })
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async create(
    @Param('consignmentId') consignmentId: string,
    @Body() reportSalesDto: CreateConsignmentSalesDto,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    reportSalesDto.consignmentId = consignmentIdNum
    await this.consignmentSalesService.reportSales(reportSalesDto)
    return { url: `/consignments/${consignmentIdNum}/reports` }
  }

  @Get(':id')
  @Render('consignment-reports/show')
  async findOne(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const idNum = parseInt(id, 10)
    const consignment = await this.consignmentsService.findOne(consignmentIdNum)
    const salesReport =
      await this.consignmentSalesService.findOneWithDetails(idNum)

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
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
    @Body() confirmDto: ConfirmConsignmentSalesDto,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const idNum = parseInt(id, 10)
    await this.consignmentSalesService.confirmSales(idNum, confirmDto)
    return { url: `/consignments/${consignmentIdNum}/reports/${idNum}` }
  }

  @Post(':id/adjust')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async adjust(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
    @Body() adjustDto: AdjustConsignmentSalesDto,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const idNum = parseInt(id, 10)
    await this.consignmentSalesService.adjustSales(idNum, adjustDto)
    return { url: `/consignments/${consignmentIdNum}/reports/${idNum}` }
  }

  @Post(':id/settle')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async settle(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
    @Body() settleDto: SettleConsignmentSalesDto,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    const idNum = parseInt(id, 10)
    await this.consignmentSalesService.settleSales(idNum, settleDto)
    return { url: `/consignments/${consignmentIdNum}/reports/${idNum}` }
  }

  // 一括精算
  @Post('bulk-settle')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Redirect()
  async bulkSettle(
    @Param('consignmentId') consignmentId: string,
    @Body() bulkSettleDto: BulkSettleConsignmentSalesDto,
  ) {
    const consignmentIdNum = parseInt(consignmentId, 10)
    await this.consignmentSalesService.bulkSettle(
      consignmentIdNum,
      new Date(bulkSettleDto.periodStart),
      new Date(bulkSettleDto.periodEnd),
      bulkSettleDto.settlementMethod,
      bulkSettleDto.notes,
    )
    return { url: `/consignments/${consignmentIdNum}/reports` }
  }

  // 精算明細書PDF生成（仮実装）
  @Get(':id/statement')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="settlement-statement.pdf"',
  )
  async generateStatement(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // PDF生成は実際にはPDFライブラリを使用しますが、ここでは仮実装
    res.send('PDF content would be generated here')
  }

  // 精算明細書メール送信（仮実装）
  @Post(':id/send-statement')
  async sendStatement(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
    @Body() body: { email: string; subject: string; message: string },
  ) {
    // メール送信は実際にはメールサービスを使用しますが、ここでは仮実装
    return {
      success: true,
      message: '精算明細書を送信しました',
    }
  }

  // 支払予定登録（仮実装）
  @Post(':id/payment-schedule')
  async createPaymentSchedule(
    @Param('consignmentId') consignmentId: string,
    @Param('id') id: string,
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
      consignmentSalesId: parseInt(id, 10),
      scheduledDate: body.scheduledDate,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      status: 'scheduled',
    }
  }

  // 支払完了記録（仮実装）
  @Post('payment-schedules/:scheduleId/complete')
  async completePayment(
    @Param('consignmentId') consignmentId: string,
    @Param('scheduleId') scheduleId: string,
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
      id: parseInt(scheduleId, 10),
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
  @Post('send-reminder')
  async sendReminder(
    @Param('consignmentId') consignmentId: string,
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
  @Post('settlement-alerts')
  async createSettlementAlerts(
    @Param('consignmentId') consignmentId: string,
    @Body() body: { alertDays: number[]; enabled: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    // アラート機能は将来的に実装
    res.status(201)
    return {
      consignmentId: parseInt(consignmentId, 10),
      alertDays: body.alertDays,
      enabled: body.enabled,
    }
  }
}
