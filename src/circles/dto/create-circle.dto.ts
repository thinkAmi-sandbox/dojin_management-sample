import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

/**
 * サークル作成用DTO
 * ValidationPipe統一パターンを適用
 */
export class CreateCircleDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'サークル名は必須です' })
  @IsString({ message: 'サークル名は文字列で入力してください' })
  @MaxLength(255, { message: 'サークル名は255文字以内で入力してください' })
  name: string

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '代表者名は必須です' })
  @IsString({ message: '代表者名は文字列で入力してください' })
  @MaxLength(255, { message: '代表者名は255文字以内で入力してください' })
  representativeName: string

  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'メールアドレスは必須です' })
  @IsEmail(
    {},
    { message: 'メールアドレスには有効なメールアドレスを入力してください' },
  )
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  email: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  description?: string
}
