import { PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateConsignmentDto } from './create-consignment.dto'

export class UpdateConsignmentDto extends PartialType(CreateConsignmentDto) {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean({ message: 'アクティブフラグはboolean値で入力してください' })
  isActive?: boolean
}
