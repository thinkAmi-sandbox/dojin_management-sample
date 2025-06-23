import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator'

/**
 * 出展書籍追加用DTO
 * ValidationPipe統一パターンを適用
 */
export class CreateExhibitBookDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined
    const num = Number.parseInt(value, 10)
    return Number.isNaN(num) ? value : num
  })
  @IsNotEmpty({ message: '書籍は必須です' })
  @IsInt({ message: '書籍IDは整数で入力してください' })
  @Min(1, { message: '書籍IDは1以上で入力してください' })
  bookId: number

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
