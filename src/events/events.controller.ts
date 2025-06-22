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
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { EventsService } from './events.service'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Render('events/index')
  async findAll() {
    const events = await this.eventsService.findAll()

    return {
      title: 'イベント一覧',
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        venue: event.venue,
        applicationStartDate: event.applicationStartDate,
        applicationEndDate: event.applicationEndDate,
        description: event.description
          ? event.description.length > 50
            ? event.description.substring(0, 50) + '...'
            : event.description
          : '',
        fullDescription: event.description || '',
        formattedEventDate: new Date(event.eventDate).toLocaleDateString(
          'ja-JP',
        ),
        formattedApplicationStartDate: new Date(
          event.applicationStartDate,
        ).toLocaleDateString('ja-JP'),
        formattedApplicationEndDate: new Date(
          event.applicationEndDate,
        ).toLocaleDateString('ja-JP'),
      })),
    }
  }

  @Get('new')
  @Render('events/new')
  renderNewForm() {
    return {
      title: '新規イベント登録',
      breadcrumbs: [
        { name: 'イベント一覧', url: '/events' },
        { name: '新規登録', url: null },
      ],
    }
  }

  @Post()
  @Redirect('/events')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() createEventDto: CreateEventDto) {
    await this.eventsService.create(createEventDto)
  }

  @Get(':id/edit')
  @Render('events/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const event = await this.eventsService.findOne(id)

    return {
      title: 'イベント編集',
      event: {
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        venue: event.venue,
        applicationStartDate: event.applicationStartDate,
        applicationEndDate: event.applicationEndDate,
        description: event.description,
      },
      breadcrumbs: [
        { name: 'イベント一覧', url: '/events' },
        { name: event.name, url: `/events/${id}` },
        { name: '編集', url: null },
      ],
    }
  }

  @Get(':id')
  @Render('events/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const event = await this.eventsService.findOne(id)

    return {
      title: 'イベント詳細',
      event: {
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        venue: event.venue,
        applicationStartDate: event.applicationStartDate,
        applicationEndDate: event.applicationEndDate,
        description: event.description || '説明なし',
        formattedEventDate: new Date(event.eventDate).toLocaleDateString(
          'ja-JP',
        ),
        formattedApplicationStartDate: new Date(
          event.applicationStartDate,
        ).toLocaleDateString('ja-JP'),
        formattedApplicationEndDate: new Date(
          event.applicationEndDate,
        ).toLocaleDateString('ja-JP'),
        formattedCreatedAt: event.createdAt.toLocaleDateString('ja-JP'),
        formattedUpdatedAt: event.updatedAt.toLocaleDateString('ja-JP'),
        editUrl: `/events/${event.id}/edit`,
      },
      breadcrumbs: [
        { name: 'イベント一覧', url: '/events' },
        { name: event.name, url: null },
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
        metatype: UpdateEventDto,
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
    @Body() updateEventDto: UpdateEventDto,
  ) {
    await this.eventsService.update(id, updateEventDto)
    return { url: `/events/${id}` }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.eventsService.remove(id)
      res.redirect('/events')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('イベントが見つかりませんでした')
      }
      throw error
    }
  }
}
