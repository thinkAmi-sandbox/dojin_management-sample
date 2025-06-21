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
  UsePipes,
  ValidationPipe,
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
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // ValidationPipeを手動で適用
      const validationPipe = new ValidationPipe()
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateDeadlineDto,
      })
      await this.deadlinesService.update(id, validatedDto)

      const deadline = await this.deadlinesService.findOne(id)
      const book = await this.deadlinesService.findBook(deadline.bookId)
      res.redirect(`/books/${book.id}/deadlines`)
    } else if (body._method === 'DELETE') {
      return this.remove(id, res)
    } else {
      res.status(404).send('Not Found')
    }
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeadlineDto: UpdateDeadlineDto,
    @Res() res: Response,
  ) {
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
