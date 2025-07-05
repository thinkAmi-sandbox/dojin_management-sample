import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

/**
 * 版作成用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class CreateEditionDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '版名は必須です' })
  @IsString({ message: '版名は文字列で入力してください' })
  @MaxLength(100, { message: '版名は100文字以内で入力してください' })
  versionName: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return 1
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsInt({ message: '版番号は整数で入力してください' })
  @Min(1, { message: '版番号は1以上で入力してください' })
  versionNumber: number

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'ISBNは文字列で入力してください' })
  @MaxLength(13, { message: 'ISBNは13文字以内で入力してください' })
  isbn?: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsPositive({ message: 'ページ数は正の数で入力してください' })
  pageCount?: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsInt({ message: '基本価格は整数で入力してください' })
  @Min(0, { message: '基本価格は0以上で入力してください' })
  basePrice: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '印刷原価は整数で入力してください' })
  @Min(0, { message: '印刷原価は0以上で入力してください' })
  printingCost?: number

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: '発行日には有効な日付を入力してください' })
  publishDate?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '版の詳細は文字列で入力してください' })
  editionNotes?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '表紙画像URLは文字列で入力してください' })
  @MaxLength(500, { message: '表紙画像URLは500文字以内で入力してください' })
  coverImageUrl?: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return true
    return value === 'true' || value === true
  })
  @IsOptional()
  @IsBoolean({ message: '現行版フラグはtrueまたはfalseで入力してください' })
  isActive?: boolean

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return false
    return value === 'true' || value === true
  })
  @IsOptional()
  @IsBoolean({ message: '完売フラグはtrueまたはfalseで入力してください' })
  isSoldOut?: boolean
}
