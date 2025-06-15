import {
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator'

export class CreateBookDto {
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @IsOptional()
  @IsString({ message: 'サブタイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'サブタイトルは255文字以下である必要があります' })
  subtitle?: string

  @IsOptional()
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string

  @IsOptional()
  @IsPositive({ message: 'ページ数は正の数である必要があります' })
  pageCount?: number
}
