import { Controller, Get, Param, ParseIntPipe, Render } from '@nestjs/common'
import { DeadlinesService } from './deadlines.service'

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
}
