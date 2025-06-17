import { PartialType } from '@nestjs/mapped-types'
import { CreatePrintingCompanyDto } from './create-printing-company.dto'

export class UpdatePrintingCompanyDto extends PartialType(
  CreatePrintingCompanyDto,
) {}
