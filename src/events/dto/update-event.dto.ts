import { PartialType } from '@nestjs/mapped-types'
import { CreateEventDto } from './create-event.dto'

/**
 * イベント更新用DTO
 * CreateEventDtoのPartialType（全フィールドオプショナル）
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
