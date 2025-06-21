import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator'

export class CreatePrintingCompanyDto {
  @IsNotEmpty({ message: '印刷所名は必須です' })
  @MaxLength(255, { message: '印刷所名は255文字以内で入力してください' })
  name: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  @MaxLength(500, { message: 'Webサイトは500文字以内で入力してください' })
  website?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @MaxLength(1000, { message: '備考は1000文字以内で入力してください' })
  notes?: string
}
