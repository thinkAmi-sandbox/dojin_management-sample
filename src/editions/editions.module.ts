import { Module } from '@nestjs/common'
import { BooksModule } from '../books/books.module'
import { DrizzleModule } from '../drizzle/drizzle.module'
import {
  EditionDetailController,
  EditionsController,
} from './editions.controller'
import { EditionsService } from './editions.service'

@Module({
  imports: [DrizzleModule, BooksModule],
  controllers: [EditionsController, EditionDetailController],
  providers: [EditionsService],
  exports: [EditionsService],
})
export class EditionsModule {}
