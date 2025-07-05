import {
  BadRequestException,
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
import { AuthorsService } from './authors.service'
import { CreateAuthorDto } from './dto/create-author.dto'
import { UpdateAuthorDto } from './dto/update-author.dto'
import { AuthorDetailView } from './views/author-detail.view'
import { AuthorEditView } from './views/author-edit.view'
import { AuthorsListView } from './views/authors-list.view'

@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly authorsService: AuthorsService,
    private readonly authorsListView: AuthorsListView,
    private readonly authorDetailView: AuthorDetailView,
    private readonly authorEditView: AuthorEditView,
  ) {}

  @Get()
  @Render('authors/index')
  async findAll() {
    const authors = await this.authorsService.findAll()
    return this.authorsListView.render(authors)
  }

  @Get('new')
  @Render('authors/new')
  renderNewForm() {
    return {
      title: '新規執筆者登録',
      author: {
        name: '',
        email: '',
        bio: '',
      },
      errors: {},
    }
  }

  @Get(':id/edit')
  @Render('authors/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const author = await this.authorsService.findOne(id)
    return this.authorEditView.render(author)
  }

  @Get(':id')
  @Render('authors/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const author = await this.authorsService.findOne(id)
    return this.authorDetailView.render(author)
  }

  @Post()
  @UsePipes(ValidationPipe)
  async create(@Body() createAuthorDto: CreateAuthorDto, @Res() res: Response) {
    try {
      await this.authorsService.create(createAuthorDto)
      res.redirect('/authors')
    } catch (error) {
      if (error.code === '23505' || error.cause?.code === '23505') {
        return res.status(200).render('authors/new', {
          title: '新規執筆者登録',
          author: {
            name: createAuthorDto.name || '',
            email: createAuthorDto.email || '',
            bio: createAuthorDto.bio || '',
          },
          errors: { email: 'このメールアドレスは既に使用されています' },
        })
      }
      throw error
    }
  }

  @Post(':id')
  updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      // 空文字列の名前の事前チェック（PartialTypeとTransformの相互作用回避）
      if (
        body.name === '' ||
        (body.name && typeof body.name === 'string' && body.name.trim() === '')
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: ['名前は必須です'],
          error: 'Bad Request',
        })
      }

      return this.update(id, body, res)
    }
    if (body._method === 'DELETE') {
      return this.removeViaPost(id, res)
    }

    res.status(404).send('Not Found')
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuthorDto: UpdateAuthorDto,
    @Res() res: Response,
  ) {
    try {
      await this.authorsService.update(id, updateAuthorDto)
      res.redirect(`/authors/${id}`)
    } catch (error) {
      if (error.code === '23505' || error.cause?.code === '23505') {
        const author = await this.authorsService.findOne(id)

        return res.status(200).render('authors/edit', {
          title: '執筆者編集',
          author: {
            id: author.id,
            name: updateAuthorDto.name || author.name,
            email: updateAuthorDto.email || author.email || '',
            bio: updateAuthorDto.bio || author.bio || '',
          },
          errors: { email: 'このメールアドレスは既に使用されています' },
          breadcrumbs: [
            { name: '執筆者一覧', url: '/authors' },
            { name: author.name, url: `/authors/${author.id}` },
            { name: '編集', url: null },
          ],
        })
      }
      throw error
    }
  }

  @Delete(':id')
  @Redirect('/authors')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.authorsService.remove(id)
  }

  async removeViaPost(id: number, res: Response) {
    await this.authorsService.remove(id)
    res.redirect('/authors')
  }
}
