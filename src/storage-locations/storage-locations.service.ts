import { Injectable, NotFoundException } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { StorageLocation, storageLocations } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateStorageLocationDto } from './dto/create-storage-location.dto'
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto'

@Injectable()
export class StorageLocationsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<StorageLocation[]> {
    return await this.drizzleService.db
      .select()
      .from(storageLocations)
      .orderBy(desc(storageLocations.createdAt))
  }

  async findOne(id: number): Promise<StorageLocation> {
    const result = await this.drizzleService.db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException(`保管場所ID ${id} が見つかりません`)
    }

    return result[0]
  }

  async create(
    createStorageLocationDto: CreateStorageLocationDto,
  ): Promise<StorageLocation> {
    const result = await this.drizzleService.db
      .insert(storageLocations)
      .values({
        name: createStorageLocationDto.name,
        type: createStorageLocationDto.type,
        isConsignment: createStorageLocationDto.isConsignment,
        address: createStorageLocationDto.address || null,
        contactInfo: createStorageLocationDto.contactInfo || null,
        notes: createStorageLocationDto.notes || null,
      })
      .returning()

    return result[0]
  }

  async update(
    id: number,
    updateStorageLocationDto: UpdateStorageLocationDto,
  ): Promise<StorageLocation> {
    // 存在確認
    await this.findOne(id)

    const result = await this.drizzleService.db
      .update(storageLocations)
      .set({
        name: updateStorageLocationDto.name,
        type: updateStorageLocationDto.type,
        isConsignment: updateStorageLocationDto.isConsignment,
        address:
          updateStorageLocationDto.address === undefined
            ? undefined
            : updateStorageLocationDto.address || null,
        contactInfo:
          updateStorageLocationDto.contactInfo === undefined
            ? undefined
            : updateStorageLocationDto.contactInfo || null,
        notes:
          updateStorageLocationDto.notes === undefined
            ? undefined
            : updateStorageLocationDto.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(storageLocations.id, id))
      .returning()

    return result[0]
  }

  async remove(id: number): Promise<void> {
    // 存在確認
    await this.findOne(id)

    await this.drizzleService.db
      .delete(storageLocations)
      .where(eq(storageLocations.id, id))
  }
}
