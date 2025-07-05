import { Transform } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

/**
 * 出展申込作成用DTO
 * ValidationPipe統一パターンを適用
 */
export class CreateExhibitDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: 'イベントは必須です' })
  @IsInt({ message: 'イベントIDは整数で入力してください' })
  @Min(1, { message: 'イベントIDは1以上で入力してください' })
  eventId: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: 'サークルは必須です' })
  @IsInt({ message: 'サークルIDは整数で入力してください' })
  @Min(1, { message: 'サークルIDは1以上で入力してください' })
  circleId: number

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(['applied', 'accepted', 'rejected', 'cancelled'], {
    message:
      'ステータスは applied, accepted, rejected, cancelled のいずれかで入力してください',
  })
  status?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'スペース番号は文字列で入力してください' })
  @MaxLength(50, { message: 'スペース番号は50文字以内で入力してください' })
  spaceNumber?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: 'スペース種別は文字列で入力してください' })
  @MaxLength(50, { message: 'スペース種別は50文字以内で入力してください' })
  spaceType?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '申込備考は文字列で入力してください' })
  applicationNotes?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '結果備考は文字列で入力してください' })
  resultNotes?: string
}
