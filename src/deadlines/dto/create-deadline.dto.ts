import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class CreateDeadlineDto {
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @MaxLength(255, { message: 'タイトルは255文字以下である必要があります' })
  title: string

  @IsNotEmpty({ message: '締切日は必須です' })
  @IsDateString({}, { message: '締切日は有効な日付である必要があります' })
  dueDate: string

  @IsOptional()
  @IsString({ message: '説明は文字列である必要があります' })
  description?: string
}
