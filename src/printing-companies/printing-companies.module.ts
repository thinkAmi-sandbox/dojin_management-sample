import { Module } from '@nestjs/common'
import { PrintingCompaniesController } from './printing-companies.controller'
import { PrintingCompaniesService } from './printing-companies.service'

@Module({
  controllers: [PrintingCompaniesController],
  providers: [PrintingCompaniesService],
})
export class PrintingCompaniesModule {}
