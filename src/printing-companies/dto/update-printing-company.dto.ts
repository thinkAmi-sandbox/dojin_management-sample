import { PartialType } from '@nestjs/mapped-types'
import { IsOptional } from 'class-validator'
import { CreatePrintingCompanyDto } from './create-printing-company.dto'

export class UpdatePrintingCompanyDto extends PartialType(
  CreatePrintingCompanyDto,
) {
  @IsOptional()
  _method?: string
}
