import { Controller, Get, Render } from '@nestjs/common'
import { BooksService } from './books.service'
import { BooksListView } from './views/books-list.view'

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly booksListView: BooksListView,
  ) {}

  @Get()
  @Render('books/index')
  async findAll() {
    const books = await this.booksService.findAll()
    return this.booksListView.render(books)
  }
}
