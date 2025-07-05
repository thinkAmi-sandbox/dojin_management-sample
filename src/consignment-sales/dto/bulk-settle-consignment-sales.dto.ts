import { Transform } from 'class-transformer'
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class BulkSettleConsignmentSalesDto {
  @IsNotEmpty({ message: '期間開始日は必須です' })
  @IsDateString({}, { message: '期間開始日には有効な日付を入力してください' })
  periodStart: string

  @IsNotEmpty({ message: '期間終了日は必須です' })
  @IsDateString({}, { message: '期間終了日には有効な日付を入力してください' })
  periodEnd: string

  @IsNotEmpty({ message: '精算方法は必須です' })
  @IsString({ message: '精算方法は文字列で入力してください' })
  settlementMethod: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
