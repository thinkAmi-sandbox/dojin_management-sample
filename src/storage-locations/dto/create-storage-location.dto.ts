import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator'

/**
 * 保管場所作成用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class CreateStorageLocationDto {
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: '保管場所名は必須です' })
  @MaxLength(255, { message: '保管場所名は255文字以内で入力してください' })
  name: string

  @IsEnum(['home', 'warehouse', 'consignment', 'event'], {
    message: '保管場所タイプは有効な値を選択してください',
  })
  type: 'home' | 'warehouse' | 'consignment' | 'event'

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true
    if (value === 'false' || value === false) return false
    return Boolean(value)
  })
  @IsBoolean({ message: '委託販売フラグは真偽値で入力してください' })
  isConsignment: boolean

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @MaxLength(500, { message: '住所は500文字以内で入力してください' })
  address?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @MaxLength(500, { message: '連絡先情報は500文字以内で入力してください' })
  contactInfo?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @MaxLength(1000, { message: '備考は1000文字以内で入力してください' })
  notes?: string
}
