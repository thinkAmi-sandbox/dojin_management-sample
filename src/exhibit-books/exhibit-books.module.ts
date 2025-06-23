import { Module } from '@nestjs/common'
import { DrizzleModule } from '../drizzle/drizzle.module'
import { ExhibitBooksController } from './exhibit-books.controller'
import { ExhibitBooksService } from './exhibit-books.service'

@Module({
  imports: [DrizzleModule],
  controllers: [ExhibitBooksController],
  providers: [ExhibitBooksService],
  exports: [ExhibitBooksService],
})
export class ExhibitBooksModule {}
