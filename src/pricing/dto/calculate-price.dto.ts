import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator'

export class CalculatePriceDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : 1)
  @IsOptional()
  @IsPositive({ message: '数量は正の数で入力してください' })
  quantity?: number

  @IsOptional()
  context?: {
    eventId?: number
    transactionType?: string
    customerType?: string
  }
}

export class PriceSimulationDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版IDは必須です' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number

  @IsNotEmpty({ message: '数量配列は必須です' })
  quantities: number[]

  @IsOptional()
  context?: {
    eventId?: number
    transactionType?: string
    customerType?: string
  }
}