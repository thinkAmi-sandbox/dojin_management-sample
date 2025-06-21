import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator'

/**
 * 書籍への執筆者追加用DTO
 * 標準化された@Transform設定と数値処理を使用
 */
export class AddAuthorToBookDto {
  @IsNotEmpty({ message: '執筆者の選択は必須です' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? value : parsed
  })
  @IsInt({ message: '執筆者IDは整数である必要があります' })
  @IsPositive({ message: '執筆者IDは正の数である必要があります' })
  authorId: number
}
