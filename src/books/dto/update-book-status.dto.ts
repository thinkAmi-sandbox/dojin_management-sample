import { IsEnum, IsNotEmpty } from 'class-validator'

export class UpdateBookStatusDto {
  @IsNotEmpty({ message: 'ステータスは必須です' })
  @IsEnum(['planning', 'writing', 'editing', 'completed'], {
    message: '有効なステータスを選択してください',
  })
  status: 'planning' | 'writing' | 'editing' | 'completed'
}
