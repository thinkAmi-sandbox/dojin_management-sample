import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'

@Module({
  imports: [DrizzleModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
