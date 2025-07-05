import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

/**
 * イベント作成用DTO
 * ValidationPipe統一パターンを適用
 */
export class CreateEventDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'イベント名は必須です' })
  @IsString({ message: 'イベント名は文字列で入力してください' })
  @MaxLength(255, { message: 'イベント名は255文字以内で入力してください' })
  name: string

  @IsNotEmpty({ message: '開催日は必須です' })
  @IsDateString({}, { message: '開催日には有効な日付を入力してください' })
  eventDate: string

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '会場名は必須です' })
  @IsString({ message: '会場名は文字列で入力してください' })
  @MaxLength(255, { message: '会場名は255文字以内で入力してください' })
  venue: string

  @IsNotEmpty({ message: '申込開始日は必須です' })
  @IsDateString({}, { message: '申込開始日には有効な日付を入力してください' })
  applicationStartDate: string

  @IsNotEmpty({ message: '申込締切日は必須です' })
  @IsDateString({}, { message: '申込締切日には有効な日付を入力してください' })
  applicationEndDate: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  description?: string
}
