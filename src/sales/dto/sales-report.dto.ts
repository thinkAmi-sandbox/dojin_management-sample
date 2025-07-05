import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class SalesReportFiltersDto {
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
    message: '販売タイプを正しく選択してください',
  })
  transactionType?: 'event' | 'consignment' | 'online' | 'direct'

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : undefined,
  )
  @IsOptional()
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  @Min(1, { message: 'イベントIDは1以上で入力してください' })
  eventId?: number

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : undefined,
  )
  @IsOptional()
  @IsInt({ message: '版IDは整数で入力してください' })
  @Min(1, { message: '版IDは1以上で入力してください' })
  editionId?: number

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(['day', 'week', 'month'], {
    message: 'グループ化期間を正しく選択してください',
  })
  groupBy?: 'day' | 'week' | 'month'
}

export class EditionSalesReportDto {
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : undefined,
  )
  @IsInt({ message: '版IDは整数で入力してください' })
  @Min(1, { message: '版IDは1以上で入力してください' })
  editionId: number

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
    message: '販売タイプを正しく選択してください',
  })
  transactionType?: 'event' | 'consignment' | 'online' | 'direct'

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(['day', 'week', 'month'], {
    message: 'グループ化期間を正しく選択してください',
  })
  groupBy?: 'day' | 'week' | 'month'
}

export class EventSalesReportDto {
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : undefined,
  )
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  @Min(1, { message: 'イベントIDは1以上で入力してください' })
  eventId: number

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
  @IsEnum(['day', 'week', 'month'], {
    message: 'グループ化期間を正しく選択してください',
  })
  groupBy?: 'day' | 'week' | 'month'
}
