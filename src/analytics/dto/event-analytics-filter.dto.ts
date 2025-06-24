import { Transform } from 'class-transformer'
import { IsDateString, IsOptional, IsString } from 'class-validator'

export class EventAnalyticsFilterDto {
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
  @IsString({ message: 'ステータスは文字列で入力してください' })
  status?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '年度は文字列で入力してください' })
  year?: string
}
