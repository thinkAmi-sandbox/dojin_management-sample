import { PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { CreateSubmissionDto } from './create-submission.dto'

/**
 * 入稿更新用DTO
 * 標準化された@Transform設定と数値処理を使用
 */
export class UpdateSubmissionDto extends PartialType(CreateSubmissionDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined
    return Number.parseInt(value, 10)
  })
  @IsInt({ message: '印刷所IDは整数で入力してください' })
  printingCompanyId?: number

  @IsOptional()
  @IsIn(['draft', 'submitted', 'printing', 'delivered', 'cancelled'], {
    message: 'ステータスは有効な値を選択してください',
  })
  status?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined
    return Number.parseInt(value, 10)
  })
  @IsInt({ message: '部数は整数で入力してください' })
  @Min(1, { message: '部数は1以上で入力してください' })
  quantity?: number

  @IsOptional()
  @IsDateString({}, { message: '入稿日には有効な日付を入力してください' })
  submissionDate?: string

  @IsOptional()
  @IsDateString({}, { message: '納品予定日には有効な日付を入力してください' })
  expectedDeliveryDate?: string

  @IsOptional()
  @IsString()
  specificationNotes?: string

  @IsOptional()
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsInt({ message: '印刷費は整数で入力してください' })
  @Min(0, { message: '印刷費は0以上で入力してください' })
  printingCost?: number | null

  @IsOptional()
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsInt({ message: '送料は整数で入力してください' })
  @Min(0, { message: '送料は0以上で入力してください' })
  shippingCost?: number | null

  @IsOptional()
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsInt({ message: 'その他費用は整数で入力してください' })
  @Min(0, { message: 'その他費用は0以上で入力してください' })
  otherCost?: number | null

  @IsOptional()
  @IsString()
  discountType?: string

  @IsOptional()
  @IsString()
  deliveryDestination?: string

  @IsOptional()
  @IsString()
  deliveryNotes?: string

  @IsOptional()
  @IsString()
  submissionFileNotes?: string

  @IsOptional()
  @IsString()
  generalNotes?: string

  @IsOptional()
  @IsString()
  _method?: string
}
