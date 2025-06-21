import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

/**
 * 入稿作成用DTO
 * 標準化された@Transform設定と数値処理を使用
 */
export class CreateSubmissionDto {
  @IsNotEmpty({ message: '印刷所を選択してください' })
  @Transform(({ value }) => value ? Number.parseInt(value, 10) : value)
  @IsInt({ message: '印刷所IDが不正です' })
  printingCompanyId: number

  @IsNotEmpty({ message: '部数を入力してください' })
  @Transform(({ value }) => value ? Number.parseInt(value, 10) : value)
  @IsInt({ message: '部数は整数で入力してください' })
  @Min(1, { message: '部数は1以上で入力してください' })
  quantity: number

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
}
