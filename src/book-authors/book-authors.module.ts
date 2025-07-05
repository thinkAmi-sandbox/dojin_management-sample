import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { BookAuthorsController } from './book-authors.controller'
import { BookAuthorsService } from './book-authors.service'

@Module({
  imports: [DrizzleModule],
  controllers: [BookAuthorsController],
  providers: [BookAuthorsService],
  exports: [BookAuthorsService],
})
export class BookAuthorsModule {}
