import { Module } from '@nestjs/common'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'
import { SubmissionsController } from './submissions.controller'
import { SubmissionsService } from './submissions.service'

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PrintingCompaniesService],
})
export class SubmissionsModule {}
