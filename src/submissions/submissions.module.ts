import { Module } from '@nestjs/common'
import { SubmissionsController } from './submissions.controller'
import { SubmissionsService } from './submissions.service'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PrintingCompaniesService],
})
export class SubmissionsModule {}
