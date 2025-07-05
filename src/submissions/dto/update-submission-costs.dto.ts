import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

/**
 * 入稿コスト情報更新用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class UpdateSubmissionCostsDto {
  // 数値変換（null許可）
  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsOptional()
  @IsInt({ message: '印刷費は整数で入力してください' })
  @Min(0, { message: '印刷費は0以上で入力してください' })
  printingCost?: number | null

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsOptional()
  @IsInt({ message: '送料は整数で入力してください' })
  @Min(0, { message: '送料は0以上で入力してください' })
  shippingCost?: number | null

  @Transform(({ value }) =>
    value && value !== '' ? Number.parseInt(value, 10) : null,
  )
  @IsOptional()
  @IsInt({ message: 'その他費用は整数で入力してください' })
  @Min(0, { message: 'その他費用は0以上で入力してください' })
  otherCost?: number | null

  @IsOptional()
  @IsString()
  _method?: string
}
