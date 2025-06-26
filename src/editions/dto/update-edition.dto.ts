import { PartialType } from '@nestjs/mapped-types'
import { CreateEditionDto } from './create-edition.dto'

/**
 * 版更新用DTO
 * CreateEditionDtoの部分更新版
 */
export class UpdateEditionDto extends PartialType(CreateEditionDto) {}
