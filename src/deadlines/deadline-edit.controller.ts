import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Redirect,
  Render,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { DeadlinesService } from './deadlines.service'
import { UpdateDeadlineDto } from './dto/update-deadline.dto'

@Controller('deadlines')
export class DeadlineEditController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Get(':id/edit')
  @Render('deadlines/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const deadline = await this.deadlinesService.findOne(id)
    const book = await this.deadlinesService.findBook(deadline.bookId)

    return {
      title: '締切編集',
      book: {
        id: book.id,
        title: book.title,
      },
      deadline: {
        id: deadline.id,
        title: deadline.title,
        dueDate: deadline.dueDate.toISOString().split('T')[0],
        description: deadline.description || '',
      },
      errors: {},
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: '締切一覧', url: `/books/${book.id}/deadlines` },
        { name: '編集', url: null },
      ],
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      return this.update(id, body, res)
    }

    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }

    res.status(404).send('Not Found')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeadlineDto: UpdateDeadlineDto,
    @Res() res: Response,
  ) {
    const errors: Record<string, string> = {}

    if (!updateDeadlineDto.title || updateDeadlineDto.title.trim() === '') {
      errors.title = 'タイトルは必須です'
    }

    if (!updateDeadlineDto.dueDate || updateDeadlineDto.dueDate.trim() === '') {
      errors.dueDate = '締切日は必須です'
    }

    if (Object.keys(errors).length > 0) {
      const deadline = await this.deadlinesService.findOne(id)
      const book = await this.deadlinesService.findBook(deadline.bookId)

      return res.status(200).render('deadlines/edit', {
        title: '締切編集',
        book: {
          id: book.id,
          title: book.title,
        },
        deadline: {
          id: deadline.id,
          title: updateDeadlineDto.title || deadline.title,
          dueDate:
            updateDeadlineDto.dueDate ||
            deadline.dueDate.toISOString().split('T')[0],
          description:
            updateDeadlineDto.description || deadline.description || '',
        },
        errors,
        breadcrumbs: [
          { name: '書籍一覧', url: '/books' },
          { name: book.title, url: `/books/${book.id}` },
          { name: '締切一覧', url: `/books/${book.id}/deadlines` },
          { name: '編集', url: null },
        ],
      })
    }

    const deadline = await this.deadlinesService.findOne(id)
    const book = await this.deadlinesService.findBook(deadline.bookId)

    await this.deadlinesService.update(id, updateDeadlineDto)
    res.redirect(`/books/${book.id}/deadlines`)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const bookId = await this.deadlinesService.remove(id)
    res.redirect(`/books/${bookId}/deadlines`)
  }
}
