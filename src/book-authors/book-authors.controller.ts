import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { BookAuthorsService } from './book-authors.service'
import { AddAuthorToBookDto } from './dto/add-author-to-book.dto'

@Controller('books/:bookId/authors')
export class BookAuthorsController {
  constructor(private readonly bookAuthorsService: BookAuthorsService) {}

  @Get()
  @Render('book-authors/index')
  async findAll(@Param('bookId', ParseIntPipe) bookId: number) {
    const book = await this.bookAuthorsService.findBook(bookId)
    const authors = await this.bookAuthorsService.findBookAuthors(bookId)

    return {
      title: '執筆者一覧',
      book: {
        id: book.id,
        title: book.title,
      },
      authors: authors.map((author) => ({
        id: author.id,
        name: author.name,
        email: author.email || '',
        bio: author.bio || '',
      })),
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: '執筆者一覧', url: null },
      ],
    }
  }

  @Get('add')
  @Render('book-authors/add')
  async renderAddForm(@Param('bookId', ParseIntPipe) bookId: number) {
    const book = await this.bookAuthorsService.findBook(bookId)
    const availableAuthors =
      await this.bookAuthorsService.findAvailableAuthors(bookId)

    return {
      title: '執筆者追加',
      book: {
        id: book.id,
        title: book.title,
      },
      authors: availableAuthors.map((author) => ({
        id: author.id,
        name: author.name,
        email: author.email || '',
      })),
      errors: {},
      breadcrumbs: [
        { name: '書籍一覧', url: '/books' },
        { name: book.title, url: `/books/${book.id}` },
        { name: '執筆者一覧', url: `/books/${book.id}/authors` },
        { name: '執筆者追加', url: null },
      ],
    }
  }

  @Post()
  async create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() addAuthorToBookDto: AddAuthorToBookDto,
    @Res() res: Response,
  ) {
    await this.bookAuthorsService.addAuthorToBook(bookId, addAuthorToBookDto)
    res.redirect(`/books/${bookId}/authors`)
  }

  @Post(':authorId')
  async removeViaPost(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('authorId', ParseIntPipe) authorId: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (body._method === 'DELETE') {
      return this.remove(bookId, authorId, res)
    }

    res.status(404).send('Not Found')
  }

  @Delete(':authorId')
  async remove(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('authorId', ParseIntPipe) authorId: number,
    @Res() res: Response,
  ) {
    await this.bookAuthorsService.removeAuthorFromBook(bookId, authorId)
    res.redirect(`/books/${bookId}/authors`)
  }
}
