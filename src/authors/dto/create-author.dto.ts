import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

/**
 * 執筆者作成用DTO
 * 標準化された@Transform設定とtrim処理を使用
 */
export class CreateAuthorDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '名前は必須です' })
  @IsString()
  name: string

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string | null

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  bio?: string | null
}
