import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Render,
} from '@nestjs/common'
import { BooksService } from './books.service'
import { CreateBookDto } from './dto/create-book.dto'
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

  @Get('new')
  @Render('books/new')
  renderNewForm() {
    return {
      title: '新規書籍作成',
      book: {
        title: '',
        subtitle: '',
        description: '',
        pageCount: '',
      },
      errors: {},
    }
  }

  @Post()
  @Redirect('/books')
  async create(@Body() createBookDto: CreateBookDto) {
    await this.booksService.create(createBookDto)
  }
}
