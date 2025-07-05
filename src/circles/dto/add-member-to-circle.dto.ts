import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator'

/**
 * サークルへのメンバー追加用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class AddMemberToCircleDto {
  @IsNotEmpty({ message: '執筆者の選択は必須です' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? value : parsed
  })
  @IsInt({ message: '執筆者IDは整数で入力してください' })
  @IsPositive({ message: '執筆者IDは正の数で入力してください' })
  authorId: number

  @IsNotEmpty({ message: '役割の選択は必須です' })
  @IsString({ message: '役割は文字列で入力してください' })
  @IsIn(['representative', 'member', 'guest'], {
    message: '役割は代表者、メンバー、ゲストのいずれかを選択してください',
  })
  role: 'representative' | 'member' | 'guest'

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
