import { Transform } from 'class-transformer'
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator'

export class CreatePricingRuleDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @IsEnum(['event_discount', 'bulk_discount', 'early_bird', 'consignment'], {
    message: '価格ルールタイプが無効です'
  })
  ruleType: 'event_discount' | 'bulk_discount' | 'early_bird' | 'consignment'

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'ルール名は必須です' })
  @IsString({ message: 'ルール名は文字列で入力してください' })
  @MaxLength(255, { message: 'ルール名は255文字以内で入力してください' })
  name: string

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @Min(0, { message: '価格は0以上で入力してください' })
  price?: number | null

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @Min(0, { message: '割引率は0以上で入力してください' })
  discountRate?: number | null

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsPositive({ message: '最小数量は正の数で入力してください' })
  minQuantity?: number | null

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  eventId?: number | null

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsDateString({}, { message: '開始日には有効な日付を入力してください' })
  validFrom?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsDateString({}, { message: '終了日には有効な日付を入力してください' })
  validUntil?: string

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 0)
  @IsOptional()
  @Min(0, { message: '優先順位は0以上で入力してください' })
  priority?: number

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean({ message: 'アクティブ状態はtrueまたはfalseで入力してください' })
  isActive?: boolean
}