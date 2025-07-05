import { Controller, Get, Query } from '@nestjs/common'
import { SalesReportFilters } from './dto'
import { SalesReportService } from './sales-report.service'

@Controller('api/sales')
export class SalesApiController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Get('reports')
  async getReportsApi(@Query() filters: SalesReportFilters) {
    return await this.salesReportService.generateSalesReport(filters)
  }

  @Get('reports/export')
  async exportReports(
    @Query() filters: SalesReportFilters & { format?: 'json' | 'csv' },
  ) {
    const format = filters.format || 'json'
    return await this.salesReportService.exportReportData(filters, format)
  }
}
