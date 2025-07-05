import { Module } from '@nestjs/common'
import { ExhibitsController } from './exhibits.controller'
import { ExhibitsService } from './exhibits.service'

@Module({
  controllers: [ExhibitsController],
  providers: [ExhibitsService],
  exports: [ExhibitsService],
})
export class ExhibitsModule {}
