import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import type { Response } from 'express'
import { CreateStorageLocationDto } from './dto/create-storage-location.dto'
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto'
import { StorageLocationsService } from './storage-locations.service'

@Controller('storage-locations')
export class StorageLocationsController {
  constructor(
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @Get()
  @Render('storage-locations/index')
  async findAll() {
    const storageLocations = await this.storageLocationsService.findAll()

    // 保管場所タイプの日本語表示マップ
    const typeDisplayMap = {
      home: '自宅',
      warehouse: '倉庫',
      consignment: '委託販売',
      event: 'イベント',
    }

    return {
      title: '保管場所一覧',
      storageLocations: storageLocations.map((location) => ({
        id: location.id,
        name: location.name,
        type: location.type,
        typeDisplay: typeDisplayMap[location.type],
        isConsignment: location.isConsignment,
        address: location.address || '',
        contactInfo: location.contactInfo || '',
        notes: location.notes
          ? location.notes.length > 50
            ? location.notes.substring(0, 50) + '...'
            : location.notes
          : '',
        fullNotes: location.notes || '',
      })),
    }
  }

  @Get('new')
  @Render('storage-locations/new')
  renderNewForm() {
    return {
      title: '新規保管場所登録',
      breadcrumbs: [
        { name: '保管場所一覧', url: '/storage-locations' },
        { name: '新規登録', url: null },
      ],
      typeOptions: [
        { value: 'home', label: '自宅' },
        { value: 'warehouse', label: '倉庫' },
        { value: 'consignment', label: '委託販売' },
        { value: 'event', label: 'イベント' },
      ],
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/storage-locations')
  async create(@Body() createStorageLocationDto: CreateStorageLocationDto) {
    await this.storageLocationsService.create(createStorageLocationDto)
  }

  @Get(':id')
  @Render('storage-locations/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const storageLocation = await this.storageLocationsService.findOne(id)

    // 保管場所タイプの日本語表示マップ
    const typeDisplayMap = {
      home: '自宅',
      warehouse: '倉庫',
      consignment: '委託販売',
      event: 'イベント',
    }

    return {
      title: '保管場所詳細',
      storageLocation: {
        id: storageLocation.id,
        name: storageLocation.name,
        type: storageLocation.type,
        typeDisplay: typeDisplayMap[storageLocation.type],
        isConsignment: storageLocation.isConsignment,
        isConsignmentDisplay: storageLocation.isConsignment ? 'はい' : 'いいえ',
        address: storageLocation.address || '未設定',
        contactInfo: storageLocation.contactInfo || '未設定',
        notes: storageLocation.notes || '未設定',
        createdAt: storageLocation.createdAt.toLocaleDateString('ja-JP'),
        updatedAt: storageLocation.updatedAt.toLocaleDateString('ja-JP'),
      },
      editUrl: `/storage-locations/${storageLocation.id}/edit`,
      deleteUrl: `/storage-locations/${storageLocation.id}`,
      listUrl: '/storage-locations',
    }
  }

  @Get(':id/edit')
  @Render('storage-locations/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const storageLocation = await this.storageLocationsService.findOne(id)

    return {
      title: '保管場所編集',
      storageLocation,
      breadcrumbs: [
        { name: '保管場所一覧', url: '/storage-locations' },
        { name: storageLocation.name, url: `/storage-locations/${id}` },
        { name: '編集', url: null },
      ],
      typeOptions: [
        { value: 'home', label: '自宅' },
        { value: 'warehouse', label: '倉庫' },
        { value: 'consignment', label: '委託販売' },
        { value: 'event', label: 'イベント' },
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
      // ValidationPipeの手動実行
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateStorageLocationDto,
      })
      await this.storageLocationsService.update(id, validatedDto)
      return res.redirect(`/storage-locations/${id}`)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // ID形式の妥当性チェック
      if (id <= 0 || isNaN(id)) {
        return res.status(400).send('無効なIDです')
      }

      await this.storageLocationsService.remove(id)
      res.redirect('/storage-locations')
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        return res.status(404).send('保管場所が見つかりませんでした')
      }
      throw error
    }
  }
}
