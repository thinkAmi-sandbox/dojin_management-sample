import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class AdjustConsignmentSalesDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '調整理由は必須です' })
  @IsString({ message: '調整理由は文字列で入力してください' })
  adjustmentReason: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '調整後売上金額は整数で入力してください' })
  @Min(0, { message: '調整後売上金額は0以上で入力してください' })
  adjustedSalesAmount?: number
}
