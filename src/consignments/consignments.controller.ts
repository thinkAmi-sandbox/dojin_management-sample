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
import { StorageLocationsService } from '../storage-locations/storage-locations.service'
import { ConsignmentsService } from './consignments.service'
import type { ConsignmentWithLocation, ConsignmentDetail } from './consignments.service'
import { CreateConsignmentDto, UpdateConsignmentDto } from './dto'

@Controller('consignments')
export class ConsignmentsController {
  constructor(
    private readonly consignmentsService: ConsignmentsService,
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @Get()
  @Render('consignments/index')
  async findAll() {
    const consignments = await this.consignmentsService.findAll()
    
    return {
      title: '委託契約一覧',
      consignments,
    }
  }

  @Get('new')
  @Render('consignments/new')
  async renderNewForm() {
    const storageLocations = await this.storageLocationsService.findAll()
    const availableLocations = storageLocations.filter(
      location => location.isConsignment && location.type === 'consignment'
    )
    
    return {
      title: '新規委託契約',
      availableLocations,
      formData: {},
      errors: {},
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/consignments')
  async create(@Body() createConsignmentDto: CreateConsignmentDto) {
    await this.consignmentsService.create(createConsignmentDto)
  }

  @Get(':id')
  @Render('consignments/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const consignment = await this.consignmentsService.findOne(id)
    
    // 委託先の売上実績も取得（将来実装予定）
    // const salesHistory = await this.consignmentSalesService.findByConsignmentId(id)
    
    return {
      title: '委託契約詳細',
      consignment,
      // salesHistory,
    }
  }

  @Get(':id/edit')
  @Render('consignments/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const consignment = await this.consignmentsService.findOne(id)
    
    return {
      title: '委託契約編集',
      consignment,
      formData: consignment,
      errors: {},
    }
  }

  @Put(':id')
  @UsePipes(ValidationPipe)
  @Redirect('/consignments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsignmentDto: UpdateConsignmentDto,
  ) {
    await this.consignmentsService.update(id, updateConsignmentDto)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.consignmentsService.remove(id)
      res.redirect('/consignments')
    } catch (error) {
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).send(error.message)
      }
      throw error
    }
  }

  @Post(':id')
  async updateViaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { _method?: string; [key: string]: unknown },
    @Res() res: Response,
  ) {
    if (body._method === 'PUT') {
      const validationPipe = new ValidationPipe({ transform: true })
      const validatedDto = await validationPipe.transform(body, {
        type: 'body',
        metatype: UpdateConsignmentDto,
      })
      await this.consignmentsService.update(id, validatedDto)
      return res.redirect(`/consignments/${id}`)
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }
}