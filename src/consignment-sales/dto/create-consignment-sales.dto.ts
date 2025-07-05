import { Transform, Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class ConsignmentSalesDetailDto {
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '数量は必須です' })
  @IsInt({ message: '数量は整数で入力してください' })
  @Min(1, { message: '数量は1以上で入力してください' })
  quantity: number

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '単価は必須です' })
  @IsInt({ message: '単価は整数で入力してください' })
  @Min(0, { message: '単価は0以上で入力してください' })
  unitPrice: number
}

export class CreateConsignmentSalesDto {
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsOptional()
  @IsInt({ message: '委託契約IDは整数で入力してください' })
  consignmentId?: number

  @IsNotEmpty({ message: '報告期間開始日は必須です' })
  @IsDateString(
    {},
    { message: '報告期間開始日には有効な日付を入力してください' },
  )
  reportPeriodStart: string

  @IsNotEmpty({ message: '報告期間終了日は必須です' })
  @IsDateString(
    {},
    { message: '報告期間終了日には有効な日付を入力してください' },
  )
  reportPeriodEnd: string

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsNotEmpty({ message: '総売上金額は必須です' })
  @IsInt({ message: '総売上金額は整数で入力してください' })
  @Min(0, { message: '総売上金額は0以上で入力してください' })
  totalSalesAmount: number

  @IsOptional()
  @IsArray({ message: '明細は配列で入力してください' })
  @ValidateNested({ each: true })
  @Type(() => ConsignmentSalesDetailDto)
  details?: ConsignmentSalesDetailDto[]

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
