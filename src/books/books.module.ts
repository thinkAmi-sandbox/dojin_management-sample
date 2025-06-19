import { Module } from '@nestjs/common'
import { ViewService } from '../common/services/view.service'
import { SubmissionsService } from '../submissions/submissions.service'
import { PrintingCompaniesService } from '../printing-companies/printing-companies.service'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { BooksListView } from './views/books-list.view'

@Module({
  controllers: [BooksController],
  providers: [
    BooksService,
    BooksListView,
    ViewService,
    SubmissionsService,
    PrintingCompaniesService,
  ],
})
export class BooksModule {}
