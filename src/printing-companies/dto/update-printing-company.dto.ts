import { PartialType } from '@nestjs/mapped-types'
import { IsOptional } from 'class-validator'
import { CreatePrintingCompanyDto } from './create-printing-company.dto'

/**
 * 印刷所更新用DTO
 * CreatePrintingCompanyDtoをベースにしたオプショナル型
 */
export class UpdatePrintingCompanyDto extends PartialType(
  CreatePrintingCompanyDto,
) {
  @IsOptional()
  _method?: string
}
