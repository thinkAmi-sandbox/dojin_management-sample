import { Transform } from 'class-transformer'
import {
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator'

/**
 * 書籍更新用DTO
 * 標準化された@Transform設定と特別なタイトルバリデーションを使用
 */
export class UpdateBookDto {
  @ValidateIf((o) => o.title !== undefined)
  @Transform(({ value }) => value?.trim() || '')
  @IsString({ message: 'タイトルは文字列で入力してください' })
  @MaxLength(255, { message: 'タイトルは255文字以内で入力してください' })
  title?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'サブタイトルは文字列で入力してください' })
  @MaxLength(255, { message: 'サブタイトルは255文字以内で入力してください' })
  subtitle?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  description?: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsPositive({ message: 'ページ数は正の数で入力してください' })
  pageCount?: number

  @IsOptional()
  @IsString()
  _method?: string
}
