import { Module, forwardRef } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { ExhibitsModule } from '../exhibits/exhibits.module'
import { CirclesController } from './circles.controller'
import { CirclesService } from './circles.service'

@Module({
  imports: [ExhibitsModule, forwardRef(() => EventsModule)],
  controllers: [CirclesController],
  providers: [CirclesService],
  exports: [CirclesService],
})
export class CirclesModule {}
