import { PartialType } from '@nestjs/mapped-types'
import { CreateExhibitBookDto } from './create-exhibit-book.dto'

/**
 * 出展書籍更新用DTO
 * ValidationPipe統一パターンを適用
 */
export class UpdateExhibitBookDto extends PartialType(CreateExhibitBookDto) {}
