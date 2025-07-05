import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsPositive, Min } from 'class-validator'

/**
 * 出展書籍追加用DTO
 * ValidationPipe統一パターンを適用（版対応）
 */
export class CreateExhibitBookDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: '版を選択してください' })
  @IsInt({ message: '版IDは整数で入力してください' })
  @Min(1, { message: '版IDは1以上で入力してください' })
  editionId: number // bookId から変更

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: '頒布予定数は必須です' })
  @IsInt({ message: '頒布予定数は整数で入力してください' })
  @Min(0, { message: '頒布予定数は0以上で入力してください' })
  plannedQuantity: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsOptional()
  @IsPositive({ message: '実際数量は正の数で入力してください' })
  actualQuantity?: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '売上数量は整数で入力してください' })
  @Min(0, { message: '売上数量は0以上で入力してください' })
  soldQuantity?: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '残数は整数で入力してください' })
  @Min(0, { message: '残数は0以上で入力してください' })
  remainingQuantity?: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: '価格は必須です' })
  @IsInt({ message: '価格は整数で入力してください' })
  @Min(0, { message: '価格は0以上で入力してください' })
  price: number

  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsOptional()
  @IsInt({ message: '表示順序は整数で入力してください' })
  @Min(0, { message: '表示順序は0以上で入力してください' })
  displayOrder?: number
}
