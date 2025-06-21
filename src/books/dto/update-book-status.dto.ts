import { Transform } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

/**
 * 書籍ステータス更新用DTO
 * 標準化された@Transform設定を使用
 */
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
