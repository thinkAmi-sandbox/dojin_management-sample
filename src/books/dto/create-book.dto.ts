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
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: 'サブタイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'サブタイトルは255文字以下である必要があります' })
  subtitle?: string

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsPositive({ message: 'ページ数は正の数である必要があります' })
  pageCount?: number
}
