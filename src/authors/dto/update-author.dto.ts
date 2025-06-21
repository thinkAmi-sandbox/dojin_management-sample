import { Transform } from 'class-transformer'
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator'

export class UpdateAuthorDto {
  @ValidateIf((o) => o.name !== undefined)
  @Transform(({ value }) => value?.trim() || '')
  @IsString({ message: '名前は文字列である必要があります' })
  name?: string

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string | null

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  bio?: string | null

  @IsOptional()
  @IsString()
  _method?: string
}
