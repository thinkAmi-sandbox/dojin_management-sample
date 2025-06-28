import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { StockMovementsController } from './stock-movements.controller'
import { StockMovementsService } from './stock-movements.service'

@Module({
  imports: [DrizzleModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
