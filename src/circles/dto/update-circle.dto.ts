import { PartialType } from '@nestjs/mapped-types'
import { CreateCircleDto } from './create-circle.dto'

/**
 * サークル更新用DTO
 * CreateCircleDtoのPartialType（全フィールドオプショナル）
 */
export class UpdateCircleDto extends PartialType(CreateCircleDto) {}
