import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { StorageLocationsController } from './storage-locations.controller'
import { StorageLocationsService } from './storage-locations.service'

@Module({
  imports: [DrizzleModule],
  controllers: [StorageLocationsController],
  providers: [StorageLocationsService],
  exports: [StorageLocationsService],
})
export class StorageLocationsModule {}
