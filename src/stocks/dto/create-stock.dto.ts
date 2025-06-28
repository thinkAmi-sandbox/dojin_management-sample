import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

/**
 * 在庫作成用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class CreateStockDto {
  // 版ID（必須）
  @Transform(({ value }) => value?.toString()?.trim())
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsString({ message: '版IDは文字列で入力してください' })
  editionId: string

  // 保管場所ID（必須）
  @Transform(({ value }) => value?.toString()?.trim())
  @IsNotEmpty({ message: '保管場所IDは必須です' })
  @IsString({ message: '保管場所IDは文字列で入力してください' })
  locationId: string

  // 総在庫数（オプショナル、デフォルト0）
  @Transform(({ value }) => (value !== '' ? Number.parseInt(value, 10) : 0))
  @IsOptional()
  @IsInt({ message: '在庫数は整数で入力してください' })
  @Min(0, { message: '在庫数は0以上で入力してください' })
  quantity?: number = 0

  // 予約済み数（オプショナル、デフォルト0）
  @Transform(({ value }) => (value !== '' ? Number.parseInt(value, 10) : 0))
  @IsOptional()
  @IsInt({ message: '予約済み数は整数で入力してください' })
  @Min(0, { message: '予約済み数は0以上で入力してください' })
  reservedQuantity?: number = 0

  // 販売可能数（オプショナル、デフォルト0）
  @Transform(({ value }) => (value !== '' ? Number.parseInt(value, 10) : 0))
  @IsOptional()
  @IsInt({ message: '販売可能数は整数で入力してください' })
  @Min(0, { message: '販売可能数は0以上で入力してください' })
  availableQuantity?: number = 0

  // 備考（オプショナル）
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
