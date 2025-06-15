import { Module } from '@nestjs/common'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { BooksListView } from './views/books-list.view'
import { ViewService } from '../common/services/view.service'

@Module({
  controllers: [BooksController],
  providers: [BooksService, BooksListView, ViewService],
})
export class BooksModule {}
