import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateConsignmentDto {
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '保管場所は必須です' })
  @IsInt({ message: '保管場所IDは整数で入力してください' })
  locationId: number

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '店舗名は必須です' })
  @IsString({ message: '店舗名は文字列で入力してください' })
  @MaxLength(255, { message: '店舗名は255文字以内で入力してください' })
  storeName: string

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '手数料率は必須です' })
  @IsInt({ message: '手数料率は整数で入力してください' })
  @Min(0, { message: '手数料率は0以上で入力してください' })
  @Max(100, { message: '手数料率は100以下で入力してください' })
  commissionRate: number

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '精算サイクルは文字列で入力してください' })
  @MaxLength(50, { message: '精算サイクルは50文字以内で入力してください' })
  settlementCycle?: string

  @IsNotEmpty({ message: '契約開始日は必須です' })
  @IsDateString({}, { message: '契約開始日には有効な日付を入力してください' })
  contractStartDate: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: '契約終了日には有効な日付を入力してください' })
  contractEndDate?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '担当者名は文字列で入力してください' })
  @MaxLength(255, { message: '担当者名は255文字以内で入力してください' })
  contactPerson?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEmail(
    {},
    {
      message: '連絡先メールアドレスには有効なメールアドレスを入力してください',
    },
  )
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  contactEmail?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '電話番号は文字列で入力してください' })
  @MaxLength(50, { message: '電話番号は50文字以内で入力してください' })
  contactPhone?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '支払情報は文字列で入力してください' })
  paymentInfo?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '契約条件は文字列で入力してください' })
  contractTerms?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
