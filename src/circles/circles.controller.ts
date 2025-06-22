import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
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
import { CirclesService } from './circles.service'
import { CreateCircleDto } from './dto/create-circle.dto'
import { UpdateCircleDto } from './dto/update-circle.dto'

@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get()
  @Render('circles/index')
  async findAll() {
    const circles = await this.circlesService.findAll()

    return {
      title: 'サークル一覧',
      circles: circles.map((circle) => ({
        id: circle.id,
        name: circle.name,
        representativeName: circle.representativeName,
        email: circle.email,
        description: circle.description
          ? circle.description.length > 50
            ? circle.description.substring(0, 50) + '...'
            : circle.description
          : '',
        fullDescription: circle.description || '',
        formattedCreatedAt: circle.createdAt.toLocaleDateString('ja-JP'),
      })),
    }
  }

  @Get('new')
  @Render('circles/new')
  renderNewForm() {
    return {
      title: '新規サークル登録',
      breadcrumbs: [
        { name: 'サークル一覧', url: '/circles' },
        { name: '新規登録', url: null },
      ],
    }
  }

  @Post()
  @Redirect('/circles')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() createCircleDto: CreateCircleDto) {
    await this.circlesService.create(createCircleDto)
  }

  @Get(':id/edit')
  @Render('circles/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const circle = await this.circlesService.findOne(id)

    return {
      title: 'サークル編集',
      circle: {
        id: circle.id,
        name: circle.name,
        representativeName: circle.representativeName,
        email: circle.email,
        description: circle.description,
      },
      breadcrumbs: [
        { name: 'サークル一覧', url: '/circles' },
        { name: circle.name, url: `/circles/${id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Get(':id')
  @Render('circles/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const circle = await this.circlesService.findOne(id)

    return {
      title: 'サークル詳細',
      circle: {
        id: circle.id,
        name: circle.name,
        representativeName: circle.representativeName,
        email: circle.email,
        description: circle.description || '説明なし',
        formattedCreatedAt: circle.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: circle.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/circles/${circle.id}/edit`,
      },
      breadcrumbs: [
        { name: 'サークル一覧', url: '/circles' },
        { name: circle.name, url: null },
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
      const validationPipe = new ValidationPipe({ whitelist: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateCircleDto,
      })
      const result = await this.update(id, validatedDto)
      return res.redirect(result.url)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  @Put(':id')
  @Redirect()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCircleDto: UpdateCircleDto,
  ) {
    await this.circlesService.update(id, updateCircleDto)
    return { url: `/circles/${id}` }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.circlesService.remove(id)
      res.redirect('/circles')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('サークルが見つかりませんでした')
      }
      throw error
    }
  }
}
