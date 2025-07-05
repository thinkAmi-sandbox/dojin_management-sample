import { Transform } from 'class-transformer'
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'

export class SalesReportFilters {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: '開始日には有効な日付を入力してください' })
  startDate?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: '終了日には有効な日付を入力してください' })
  endDate?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(['event', 'consignment', 'online', 'direct'], {
    message: '販売タイプを選択してください',
  })
  transactionType?: 'event' | 'consignment' | 'online' | 'direct'

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(['day', 'week', 'month'], {
    message: '集計単位を選択してください',
  })
  groupBy?: 'day' | 'week' | 'month'

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'フォーマットは文字列で入力してください' })
  @IsEnum(['json', 'csv'], {
    message: 'エクスポート形式を選択してください',
  })
  format?: 'json' | 'csv'
}
