import { Transform } from 'class-transformer'
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

/**
 * 在庫移動記録作成用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class CreateStockMovementDto {
  // 版ID（必須）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsDefined({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  // 移動元保管場所ID（必須でエラーメッセージテスト用）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsDefined({ message: '移動元保管場所は必須です' })
  @IsInt({ message: '移動元保管場所IDは整数で入力してください' })
  fromLocationId: number

  // 移動先保管場所ID（必須でエラーメッセージテスト用）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsDefined({ message: '移動先保管場所は必須です' })
  @IsInt({ message: '移動先保管場所IDは整数で入力してください' })
  toLocationId: number

  // 移動数量（必須、1以上）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsDefined({ message: '移動数量は必須です' })
  @IsInt({ message: '移動数量は整数で入力してください' })
  @Min(1, { message: '移動数量は1以上で入力してください' })
  quantity: number

  // 移動タイプ（必須）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDefined({ message: '移動タイプは必須です' })
  @IsEnum(
    [
      'inbound',
      'outbound',
      'transfer',
      'sale',
      'return',
      'adjustment',
      'disposal',
    ],
    { message: '移動タイプを正しく選択してください' },
  )
  movementType:
    | 'inbound'
    | 'outbound'
    | 'transfer'
    | 'sale'
    | 'return'
    | 'adjustment'
    | 'disposal'

  // 関連レコードタイプ（オプショナル）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '関連レコードタイプは文字列で入力してください' })
  referenceType?: string

  // 関連レコードID（オプショナル）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '関連レコードIDは整数で入力してください' })
  referenceId?: number

  // 移動理由（オプショナル）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '移動理由は文字列で入力してください' })
  reason?: string

  // 作成者（オプショナル）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '作成者は文字列で入力してください' })
  createdBy?: string
}
