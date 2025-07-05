import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { StorageLocationsModule } from '../storage-locations/storage-locations.module'
import { ConsignmentsController } from './consignments.controller'
import { ConsignmentsService } from './consignments.service'

@Module({
  imports: [DrizzleModule, StorageLocationsModule],
  controllers: [ConsignmentsController],
  providers: [ConsignmentsService],
  exports: [ConsignmentsService],
})
export class ConsignmentsModule {}
