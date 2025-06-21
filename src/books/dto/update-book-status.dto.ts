import { Transform } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class UpdateBookStatusDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNotEmpty({ message: 'ステータスは必須です' })
  @IsEnum(['planning', 'writing', 'editing', 'completed'], {
    message: '有効なステータスを選択してください',
  })
  status: 'planning' | 'writing' | 'editing' | 'completed'

  @IsOptional()
  @IsString()
  _method?: string
}
