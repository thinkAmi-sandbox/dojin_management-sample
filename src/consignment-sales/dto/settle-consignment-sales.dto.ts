import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class SettleConsignmentSalesDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '精算方法は必須です' })
  @IsString({ message: '精算方法は文字列で入力してください' })
  @MaxLength(50, { message: '精算方法は50文字以内で入力してください' })
  settlementMethod: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '精算時コメントは文字列で入力してください' })
  notes?: string
}
