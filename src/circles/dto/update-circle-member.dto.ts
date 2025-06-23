import { Transform } from 'class-transformer'
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator'

/**
 * サークルメンバー情報更新用DTO
 * 標準化された@Transform設定・エラーメッセージを使用
 */
export class UpdateCircleMemberDto {
  @IsOptional()
  @IsString({ message: '役割は文字列で入力してください' })
  @IsIn(['representative', 'member', 'guest'], {
    message: '役割は代表者、メンバー、ゲストのいずれかを選択してください',
  })
  role?: 'representative' | 'member' | 'guest'

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: '退会日には有効な日付を入力してください' })
  leftAt?: string

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
