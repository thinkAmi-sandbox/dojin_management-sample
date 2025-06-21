import { Transform } from 'class-transformer'
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator'

/**
 * 執筆者更新用DTO
 * 標準化された@Transform設定と特別な名前バリデーションを使用
 */
export class UpdateAuthorDto {
  @ValidateIf((o) => o.name !== undefined)
  @Transform(({ value }) => value?.trim() || '')
  @IsString({ message: '名前は文字列で入力してください' })
  name?: string

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string | null

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  bio?: string | null

  @IsOptional()
  @IsString()
  _method?: string
}
