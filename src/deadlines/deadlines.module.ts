import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { DeadlinesController } from './deadlines.controller'
import { DeadlinesService } from './deadlines.service'

@Module({
  imports: [DrizzleModule],
  controllers: [DeadlinesController],
  providers: [DeadlinesService],
})
export class DeadlinesModule {}
