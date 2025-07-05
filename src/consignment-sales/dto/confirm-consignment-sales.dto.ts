import { Transform } from 'class-transformer'
import { IsOptional, IsString } from 'class-validator'

export class ConfirmConsignmentSalesDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '確認コメントは文字列で入力してください' })
  notes?: string
}
