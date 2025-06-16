import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateAuthorDto {
  @IsNotEmpty({ message: '名前は必須です' })
  @IsString()
  name: string

  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string | null

  @IsOptional()
  @IsString()
  bio?: string | null
}
