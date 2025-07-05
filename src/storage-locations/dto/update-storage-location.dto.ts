import { PartialType } from '@nestjs/mapped-types'
import { CreateStorageLocationDto } from './create-storage-location.dto'

/**
 * 保管場所更新用DTO
 * CreateStorageLocationDtoのPartialType
 */
export class UpdateStorageLocationDto extends PartialType(
  CreateStorageLocationDto,
) {}
