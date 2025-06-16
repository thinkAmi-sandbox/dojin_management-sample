import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateAuthorDto {
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
