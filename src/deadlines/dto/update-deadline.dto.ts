import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class UpdateDeadlineDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    return value?.trim()
  })
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    return value?.trim()
  })
  @IsNotEmpty({ message: '締切日は必須です' })
  @IsDateString({}, { message: '締切日は有効な日付である必要があります' })
  dueDate: string

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string

  @IsOptional()
  @IsString()
  _method?: string
}
