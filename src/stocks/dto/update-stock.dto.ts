import { PartialType } from '@nestjs/mapped-types'
import { CreateStockDto } from './create-stock.dto'

/**
 * 在庫更新用DTO
 * CreateStockDtoの部分型で全フィールドをオプショナルに
 */
export class UpdateStockDto extends PartialType(CreateStockDto) {}
