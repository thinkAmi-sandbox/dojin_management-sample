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
import { EventsService } from '../events/events.service'
import { CreateExhibitDto } from '../exhibits/dto/create-exhibit.dto'
import { ExhibitsService } from '../exhibits/exhibits.service'
import { CirclesService } from './circles.service'
import { CreateCircleDto } from './dto/create-circle.dto'
import { UpdateCircleDto } from './dto/update-circle.dto'

@Controller('circles')
export class CirclesController {
  constructor(
    private readonly circlesService: CirclesService,
    private readonly exhibitsService: ExhibitsService,
    private readonly eventsService: EventsService,
  ) {}

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

  // サークル別出展履歴一覧
  @Get(':circleId/exhibits')
  @Render('circles/exhibits/index')
  async findCircleExhibits(@Param('circleId', ParseIntPipe) circleId: number) {
    const circle = await this.circlesService.findOne(circleId)
    const exhibits = await this.exhibitsService.findByCircleId(circleId)

    // ステータス日本語変換
    const statusMap = {
      applied: '申込中',
      accepted: '当選',
      rejected: '落選',
      cancelled: 'キャンセル',
    }

    return {
      title: `${circle.name} - 出展履歴`,
      circle: {
        id: circle.id,
        name: circle.name,
        representativeName: circle.representativeName,
        email: circle.email,
      },
      exhibits: exhibits.map((exhibit) => ({
        id: exhibit.id,
        status: exhibit.status,
        statusLabel: statusMap[exhibit.status],
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
        applicationNotes: exhibit.applicationNotes || '-',
        resultNotes: exhibit.resultNotes || '-',
        formattedApplicationDate:
          exhibit.applicationDate.toLocaleDateString('ja-JP'),
        formattedResultDate: exhibit.resultDate
          ? exhibit.resultDate.toLocaleDateString('ja-JP')
          : '-',
        event: {
          id: exhibit.event.id,
          name: exhibit.event.name,
          formattedEventDate: new Date(
            exhibit.event.eventDate,
          ).toLocaleDateString('ja-JP'),
          venue: exhibit.event.venue,
        },
      })),
      // 出展実績集計
      stats: {
        total: exhibits.length,
        applied: exhibits.filter((e) => e.status === 'applied').length,
        accepted: exhibits.filter((e) => e.status === 'accepted').length,
        rejected: exhibits.filter((e) => e.status === 'rejected').length,
        cancelled: exhibits.filter((e) => e.status === 'cancelled').length,
      },
    }
  }

  // サークルからの新規出展申込フォーム
  @Get(':circleId/exhibits/new')
  @Render('circles/exhibits/new')
  async renderCircleExhibitForm(
    @Param('circleId', ParseIntPipe) circleId: number,
  ) {
    const circle = await this.circlesService.findOne(circleId)
    const events = await this.eventsService.findAll()

    return {
      title: `${circle.name} - 新規出展申込`,
      circle: {
        id: circle.id,
        name: circle.name,
        representativeName: circle.representativeName,
        email: circle.email,
      },
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        formattedEventDate: new Date(event.eventDate).toLocaleDateString(
          'ja-JP',
        ),
        venue: event.venue,
        formattedApplicationEndDate: new Date(
          event.applicationEndDate,
        ).toLocaleDateString('ja-JP'),
      })),
    }
  }

  // サークルからの新規出展申込処理
  @Post(':circleId/exhibits')
  @Redirect()
  async createCircleExhibit(
    @Param('circleId', ParseIntPipe) circleId: number,
    @Body() body: Record<string, unknown>,
  ) {
    // circleIdをbodyに追加してからバリデーション
    body.circleId = circleId

    // デフォルトステータスを設定
    if (!body.status) {
      body.status = 'applied'
    }

    // 手動でValidationPipeを適用
    const validationPipe = new ValidationPipe({ transform: true })
    const createExhibitDto = await validationPipe.transform(body, {
      type: 'body',
      metatype: CreateExhibitDto,
    })

    await this.exhibitsService.create(createExhibitDto)
    return { url: `/circles/${circleId}/exhibits` }
  }
}
