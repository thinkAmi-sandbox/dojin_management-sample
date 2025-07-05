import { Transform } from 'class-transformer'
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

/**
 * 入稿ステータス更新用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class UpdateSubmissionStatusDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'ステータスは必須です' })
  @IsIn(['draft', 'submitted', 'printing', 'delivered', 'cancelled'], {
    message: 'ステータスは有効な値を選択してください',
  })
  status: string

  @IsOptional()
  @IsString()
  _method?: string
}
