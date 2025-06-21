import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

/**
 * 締切作成用DTO
 * 標準化された@Transform設定と日付処理を使用
 */
export class CreateDeadlineDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '締切日は必須です' })
  @IsDateString({}, { message: '締切日は有効な日付である必要があります' })
  dueDate: string

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string
}
