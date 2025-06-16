import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { DeadlineEditController } from './deadline-edit.controller'
import { DeadlinesController } from './deadlines.controller'
import { DeadlinesService } from './deadlines.service'

@Module({
  imports: [DrizzleModule],
  controllers: [DeadlinesController, DeadlineEditController],
  providers: [DeadlinesService],
})
export class DeadlinesModule {}
