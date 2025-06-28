import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Redirect,
  Render,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { CreateStockMovementDto } from './dto/create-stock-movement.dto'
import { StockMovementFiltersDto } from './dto/stock-movement-filters.dto'
import { StockMovementsService } from './stock-movements.service'

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @Render('stock-movements/index')
  async findAll(@Query() filters: StockMovementFiltersDto) {
    const movements = await this.stockMovementsService.findAll(filters)

    // 移動タイプの日本語変換
    const movementTypeMap: Record<string, string> = {
      inbound: '入庫',
      outbound: '出庫',
      transfer: '移動',
      sale: '販売',
      return: '返品',
      adjustment: '調整',
      disposal: '廃棄',
    }

    return {
      title: '在庫移動履歴',
      movements: movements.map((movement) => ({
        id: movement.id,
        quantity: movement.quantity,
        movementType:
          movementTypeMap[movement.movementType] || movement.movementType,
        movementTypeValue: movement.movementType,
        reason: movement.reason
          ? movement.reason.length > 30
            ? movement.reason.substring(0, 30) + '...'
            : movement.reason
          : '-',
        movedAt: movement.movedAt.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        editionName: `${movement.bookTitle}（${movement.editionVersionName}）`,
        fromLocationName: movement.fromLocationName || '-',
        toLocationName: movement.toLocationName || '-',
        createdBy: movement.createdBy || '-',
      })),
      filters: {
        editionId: filters.editionId || '',
        movementType: filters.movementType || '',
        fromLocationId: filters.fromLocationId || '',
        toLocationId: filters.toLocationId || '',
      },
    }
  }

  @Get(':id')
  @Render('stock-movements/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const movement = await this.stockMovementsService.findOne(id)

    // 移動タイプの日本語変換
    const movementTypeMap: Record<string, string> = {
      inbound: '入庫',
      outbound: '出庫',
      transfer: '移動',
      sale: '販売',
      return: '返品',
      adjustment: '調整',
      disposal: '廃棄',
    }

    return {
      title: '在庫移動記録詳細',
      movement: {
        id: movement.id,
        quantity: movement.quantity.toLocaleString('ja-JP'),
        movementType:
          movementTypeMap[movement.movementType] || movement.movementType,
        reason: movement.reason || '-',
        movedAt: movement.movedAt.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: movement.createdAt.toLocaleDateString('ja-JP'),
        editionName: `${movement.bookTitle}（${movement.editionVersionName}）`,
        editionBasePrice:
          movement.editionBasePrice.toLocaleString('ja-JP') + '円',
        fromLocationName: movement.fromLocationName || '-',
        fromLocationType: '',
        toLocationName: movement.toLocationName || '-',
        toLocationType: '',
        createdBy: movement.createdBy || '-',
      },
      // URL生成
      listUrl: '/stock-movements',
    }
  }

  @Post()
  @UsePipes(ValidationPipe)
  @Redirect('/stock-movements')
  async create(@Body() createStockMovementDto: CreateStockMovementDto) {
    await this.stockMovementsService.create(createStockMovementDto)
  }
}
