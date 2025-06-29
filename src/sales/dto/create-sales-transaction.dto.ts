import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateSalesDetailDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '数量は必須です' })
  @IsPositive({ message: '数量は正の数で入力してください' })
  quantity: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '単価は必須です' })
  @IsPositive({ message: '単価は正の数で入力してください' })
  unitPrice: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 0)
  @IsOptional()
  @Min(0, { message: '割引金額は0以上で入力してください' })
  discountAmount?: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}

export class CreateSalesTransactionDto {
  @IsEnum(['event', 'consignment', 'online', 'direct'], {
    message: '販売タイプを選択してください'
  })
  transactionType: 'event' | 'consignment' | 'online' | 'direct'

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  eventId?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: '出展IDは整数で入力してください' })
  exhibitId?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: '保管場所IDは整数で入力してください' })
  locationId?: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '顧客名は文字列で入力してください' })
  @MaxLength(255, { message: '顧客名は255文字以内で入力してください' })
  customerName?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsEmail({}, { message: '顧客メールアドレスには有効なメールアドレスを入力してください' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  customerEmail?: string

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '合計金額は必須です' })
  @IsPositive({ message: '合計金額は正の数で入力してください' })
  totalAmount: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 0)
  @IsOptional()
  @Min(0, { message: '割引金額は0以上で入力してください' })
  discountAmount?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '最終金額は必須です' })
  @IsPositive({ message: '最終金額は正の数で入力してください' })
  finalAmount: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '支払方法は文字列で入力してください' })
  @MaxLength(50, { message: '支払方法は50文字以内で入力してください' })
  paymentMethod?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string

  @IsArray({ message: '販売明細は配列で入力してください' })
  @ValidateNested({ each: true })
  @Type(() => CreateSalesDetailDto)
  details: CreateSalesDetailDto[]
}