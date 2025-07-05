import { Module } from '@nestjs/common'
import { SalesApiController } from './sales-api.controller'
import { SalesReportService } from './sales-report.service'
import { SalesController } from './sales.controller'
import { SalesService } from './sales.service'

@Module({
  controllers: [SalesController, SalesApiController],
  providers: [SalesService, SalesReportService],
  exports: [SalesService, SalesReportService],
})
export class SalesModule {}
