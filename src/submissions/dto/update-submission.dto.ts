import { PartialType } from '@nestjs/mapped-types'
import { CreateSubmissionDto } from './create-submission.dto'
import { IsOptional, IsIn, IsInt, Min, IsString, IsDateString } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateSubmissionDto extends PartialType(CreateSubmissionDto) {
  @IsOptional()
  @Transform(({ value }) => 
    value === '' || value === null || value === undefined ? undefined : Number.parseInt(value, 10)
  )
  @IsInt({ message: '印刷所IDが不正です' })
  printingCompanyId?: number

  @IsOptional()
  @IsIn(['draft', 'submitted', 'printing', 'delivered', 'cancelled'], {
    message: 'ステータスは有効な値を選択してください',
  })
  status?: string

  @IsOptional()
  @Transform(({ value }) => 
    value === '' || value === null || value === undefined ? undefined : Number.parseInt(value, 10)
  )
  @IsInt({ message: '部数は整数で入力してください' })
  @Min(1, { message: '部数は1以上で入力してください' })
  quantity?: number

  @IsOptional()
  @IsDateString({}, { message: '入稿日の形式が不正です' })
  submissionDate?: string

  @IsOptional()
  @IsDateString({}, { message: '納品予定日の形式が不正です' })
  expectedDeliveryDate?: string

  @IsOptional()
  @IsString()
  specificationNotes?: string

  @IsOptional()
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsInt({ message: '印刷費は整数で入力してください' })
  @Min(0, { message: '印刷費は0以上で入力してください' })
  printingCost?: number | null

  @IsOptional()
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsInt({ message: '送料は整数で入力してください' })
  @Min(0, { message: '送料は0以上で入力してください' })
  shippingCost?: number | null

  @IsOptional()
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
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
}
