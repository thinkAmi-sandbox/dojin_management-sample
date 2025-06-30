import { PartialType } from '@nestjs/mapped-types'
import { CreateSalesTransactionDto } from './create-sales-transaction.dto'

export class UpdateSalesTransactionDto extends PartialType(
  CreateSalesTransactionDto,
) {}
