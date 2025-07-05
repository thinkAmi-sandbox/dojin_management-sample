import { Module } from '@nestjs/common'
import { ConsignmentsModule } from '../consignments/consignments.module'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { EditionsModule } from '../editions/editions.module'
import { ConsignmentAnalyticsController } from './consignment-analytics.controller'
import { ConsignmentReportsController } from './consignment-reports.controller'
import { ConsignmentSalesService } from './consignment-sales.service'

@Module({
  imports: [DrizzleModule, ConsignmentsModule, EditionsModule],
  controllers: [ConsignmentReportsController, ConsignmentAnalyticsController],
  providers: [ConsignmentSalesService],
  exports: [ConsignmentSalesService],
})
export class ConsignmentSalesModule {}
