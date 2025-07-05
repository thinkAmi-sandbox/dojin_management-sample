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
import * as schema from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import { CreateExhibitDto } from './dto/create-exhibit.dto'
import { UpdateExhibitDto } from './dto/update-exhibit.dto'
import { ExhibitsService } from './exhibits.service'

@Controller('exhibits')
export class ExhibitsController {
  constructor(
    private readonly exhibitsService: ExhibitsService,
    private readonly drizzleService: DrizzleService,
  ) {}

  @Get()
  @Render('exhibits/index')
  async findAll() {
    const exhibits = await this.exhibitsService.findAll()

    // ステータスの日本語マッピング
    const statusMap = {
      applied: '申込済み',
      accepted: '当選',
      rejected: '落選',
      cancelled: 'キャンセル',
    }

    return {
      title: '出展申込一覧',
      exhibits: exhibits.map((exhibit) => ({
        id: exhibit.id,
        status: exhibit.status,
        statusText:
          statusMap[exhibit.status as keyof typeof statusMap] || exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
        applicationNotes: exhibit.applicationNotes
          ? exhibit.applicationNotes.length > 30
            ? exhibit.applicationNotes.substring(0, 30) + '...'
            : exhibit.applicationNotes
          : '',
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
        circle: {
          id: exhibit.circle.id,
          name: exhibit.circle.name,
          representativeName: exhibit.circle.representativeName,
        },
      })),
    }
  }

  @Get('new')
  @Render('exhibits/new')
  async renderNewForm() {
    // イベント一覧を取得
    const events = await this.drizzleService.db
      .select()
      .from(schema.events)
      .orderBy(schema.events.eventDate)

    // サークル一覧を取得
    const circles = await this.drizzleService.db
      .select()
      .from(schema.circles)
      .orderBy(schema.circles.name)

    return {
      title: '新規出展申込',
      events: events.map((event) => ({
        id: event.id,
        name: `${event.name} (${new Date(event.eventDate).toLocaleDateString('ja-JP')})`,
      })),
      circles: circles.map((circle) => ({
        id: circle.id,
        name: `${circle.name} (${circle.representativeName})`,
      })),
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '新規申込', url: null },
      ],
    }
  }

  @Post()
  @Redirect('/exhibits')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() createExhibitDto: CreateExhibitDto) {
    await this.exhibitsService.create(createExhibitDto)
  }

  @Get(':id/edit')
  @Render('exhibits/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const exhibit = await this.exhibitsService.findOne(id)

    // イベント一覧を取得
    const events = await this.drizzleService.db
      .select()
      .from(schema.events)
      .orderBy(schema.events.eventDate)

    // サークル一覧を取得
    const circles = await this.drizzleService.db
      .select()
      .from(schema.circles)
      .orderBy(schema.circles.name)

    return {
      title: '出展申込編集',
      exhibit: {
        id: exhibit.id,
        eventId: exhibit.eventId,
        circleId: exhibit.circleId,
        status: exhibit.status,
        spaceNumber: exhibit.spaceNumber,
        spaceType: exhibit.spaceType,
        applicationNotes: exhibit.applicationNotes,
        resultNotes: exhibit.resultNotes,
      },
      events: events.map((event) => ({
        id: event.id,
        name: `${event.name} (${new Date(event.eventDate).toLocaleDateString('ja-JP')})`,
      })),
      circles: circles.map((circle) => ({
        id: circle.id,
        name: `${circle.name} (${circle.representativeName})`,
      })),
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: `申込詳細`, url: `/exhibits/${id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Get(':id')
  @Render('exhibits/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const exhibit = await this.exhibitsService.findOne(id)

    // ステータスの日本語マッピング
    const statusMap = {
      applied: '申込済み',
      accepted: '当選',
      rejected: '落選',
      cancelled: 'キャンセル',
    }

    return {
      title: '出展申込詳細',
      exhibit: {
        id: exhibit.id,
        status: exhibit.status,
        statusText:
          statusMap[exhibit.status as keyof typeof statusMap] || exhibit.status,
        spaceNumber: exhibit.spaceNumber || '-',
        spaceType: exhibit.spaceType || '-',
        applicationNotes: exhibit.applicationNotes || '備考なし',
        resultNotes: exhibit.resultNotes || '結果備考なし',
        formattedApplicationDate:
          exhibit.applicationDate.toLocaleDateString('ja-JP'),
        formattedResultDate: exhibit.resultDate
          ? exhibit.resultDate.toLocaleDateString('ja-JP')
          : '-',
        formattedCreatedAt: exhibit.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: exhibit.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/exhibits/${exhibit.id}/edit`,
        event: {
          id: exhibit.event.id,
          name: exhibit.event.name,
          formattedEventDate: new Date(
            exhibit.event.eventDate,
          ).toLocaleDateString('ja-JP'),
          venue: exhibit.event.venue,
          formattedApplicationStartDate: new Date(
            exhibit.event.applicationStartDate,
          ).toLocaleDateString('ja-JP'),
          formattedApplicationEndDate: new Date(
            exhibit.event.applicationEndDate,
          ).toLocaleDateString('ja-JP'),
          description: exhibit.event.description || '説明なし',
        },
        circle: {
          id: exhibit.circle.id,
          name: exhibit.circle.name,
          representativeName: exhibit.circle.representativeName,
          email: exhibit.circle.email,
          description: exhibit.circle.description || '説明なし',
        },
      },
      breadcrumbs: [
        { name: '出展申込一覧', url: '/exhibits' },
        { name: '申込詳細', url: null },
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
        metatype: UpdateExhibitDto,
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
    @Body() updateExhibitDto: UpdateExhibitDto,
  ) {
    await this.exhibitsService.update(id, updateExhibitDto)
    return { url: `/exhibits/${id}` }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.exhibitsService.remove(id)
      res.redirect('/exhibits')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('出展申込が見つかりませんでした')
      }
      throw error
    }
  }
}
