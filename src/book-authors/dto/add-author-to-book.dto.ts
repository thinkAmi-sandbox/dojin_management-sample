import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator'

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
