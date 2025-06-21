import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { DeadlinesService } from './deadlines.service'
import { CreateDeadlineDto } from './dto/create-deadline.dto'

@Controller('books/:bookId/deadlines')
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Get()
  @Render('deadlines/index')
  async findAll(@Param('bookId', ParseIntPipe) bookId: number) {
    const book = await this.deadlinesService.findBook(bookId)
    const deadlinesList = await this.deadlinesService.findAllByBookId(bookId)

    const formattedDeadlines = deadlinesList.map((deadline) => ({
      ...deadline,
      formattedDueDate: deadline.dueDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }))

    return {
      title: '締切一覧',
      book: {
        id: book.id,
        title: book.title,
      },
      deadlines: formattedDeadlines,
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: '締切一覧', url: null },
      ],
    }
  }

  @Get('new')
  @Render('deadlines/new')
  async renderNewForm(@Param('bookId', ParseIntPipe) bookId: number) {
    const book = await this.deadlinesService.findBook(bookId)

    return {
      title: '締切追加',
      book: {
        id: book.id,
        title: book.title,
      },
      deadline: {
        title: '',
        dueDate: '',
        description: '',
      },
      errors: {},
      breadcrumbs: [
        { name: '書籍一覧', url: '/books', isLast: false },
        { name: book.title, url: `/books/${book.id}`, isLast: false },
        { name: '締切一覧', url: `/books/${book.id}/deadlines`, isLast: false },
        { name: '締切追加', url: null, isLast: true },
      ],
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect()
  async create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() createDeadlineDto: CreateDeadlineDto,
  ) {
    await this.deadlinesService.create(bookId, createDeadlineDto)
    return { url: `/books/${bookId}/deadlines` }
  }
}
