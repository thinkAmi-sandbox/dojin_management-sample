import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional } from 'class-validator'

/**
 * 在庫移動履歴フィルタリング用DTO
 */
export class StockMovementFiltersDto {
  // 版ID（フィルタ用、オプショナル）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? undefined : num
  })
  @IsOptional()
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId?: number

  // 移動タイプ（フィルタ用、オプショナル）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
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
  movementType?:
    | 'inbound'
    | 'outbound'
    | 'transfer'
    | 'sale'
    | 'return'
    | 'adjustment'
    | 'disposal'

  // 移動元保管場所ID（フィルタ用、オプショナル）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? undefined : num
  })
  @IsOptional()
  @IsInt({ message: '移動元保管場所IDは整数で入力してください' })
  fromLocationId?: number

  // 移動先保管場所ID（フィルタ用、オプショナル）
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number(value)
    return isNaN(num) ? undefined : num
  })
  @IsOptional()
  @IsInt({ message: '移動先保管場所IDは整数で入力してください' })
  toLocationId?: number
}
