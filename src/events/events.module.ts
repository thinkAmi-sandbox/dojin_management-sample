import { Module } from '@nestjs/common'
import { CirclesModule } from '../circles/circles.module'
import { ExhibitsModule } from '../exhibits/exhibits.module'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'

@Module({
  imports: [ExhibitsModule, CirclesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
