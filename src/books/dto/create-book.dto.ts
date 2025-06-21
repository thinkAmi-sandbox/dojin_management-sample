import { Transform } from 'class-transformer'
import {
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator'

/**
 * 書籍作成用DTO
 * 標準化された@Transform設定を使用
 */
export class CreateBookDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列で入力してください' })
  @MaxLength(255, { message: 'タイトルは255文字以内で入力してください' })
  title: string

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
}
