import { PartialType } from '@nestjs/mapped-types'
import { CreateExhibitDto } from './create-exhibit.dto'

/**
 * 出展申込更新用DTO
 * ValidationPipe統一パターンを適用（PartialType使用）
 */
export class UpdateExhibitDto extends PartialType(CreateExhibitDto) {}
