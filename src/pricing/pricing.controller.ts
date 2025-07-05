import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { eq } from 'drizzle-orm'
import type { Response } from 'express'
import { editions, pricingRules } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import {
  CalculatePriceDto,
  PriceSimulationDto,
} from './dto/calculate-price.dto'
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto'
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto'
import { PricingService } from './pricing.service'

@Controller()
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly drizzleService: DrizzleService,
  ) {}

  // 価格計算API
  @Post('api/pricing/calculate')
  @UsePipes(ValidationPipe)
  async calculatePrice(
    @Body() calculatePriceDto: CalculatePriceDto,
    @Res() res: Response,
  ) {
    const result = await this.pricingService.calculatePrice(
      calculatePriceDto.editionId,
      calculatePriceDto.quantity || 1,
      calculatePriceDto.context || {},
    )
    return res.status(200).json(result)
  }

  // 価格シミュレーションAPI
  @Post('api/pricing/simulate')
  @UsePipes(ValidationPipe)
  async simulatePrice(
    @Body() priceSimulationDto: PriceSimulationDto,
    @Res() res: Response,
  ) {
    const simulations = []

    for (const quantity of priceSimulationDto.quantities) {
      const result = await this.pricingService.calculatePrice(
        priceSimulationDto.editionId,
        quantity,
        priceSimulationDto.context || {},
      )
      simulations.push(result)
    }

    return res.status(200).json({ simulations })
  }

  // 価格ルール一覧
  @Get('pricing-rules')
  @Render('pricing-rules/index')
  async findAll() {
    const pricingRulesList = await this.drizzleService.db
      .select({
        id: pricingRules.id,
        editionId: pricingRules.editionId,
        ruleType: pricingRules.ruleType,
        name: pricingRules.name,
        price: pricingRules.price,
        discountRate: pricingRules.discountRate,
        minQuantity: pricingRules.minQuantity,
        eventId: pricingRules.eventId,
        priority: pricingRules.priority,
        isActive: pricingRules.isActive,
        createdAt: pricingRules.createdAt,
      })
      .from(pricingRules)
      .orderBy(pricingRules.priority, pricingRules.createdAt)

    return {
      title: '価格ルール一覧',
      pricingRules: pricingRulesList,
    }
  }

  // 新規価格ルール作成フォーム
  @Get('pricing-rules/new')
  @Render('pricing-rules/new')
  renderNewForm() {
    return {
      title: '新規価格ルール作成',
      formData: {},
    }
  }

  // 価格ルール作成
  @Post('pricing-rules')
  @UsePipes(ValidationPipe)
  @Redirect('/pricing-rules')
  async create(@Body() createPricingRuleDto: CreatePricingRuleDto) {
    // 版の存在確認
    const editionExists = await this.drizzleService.db
      .select()
      .from(editions)
      .where(eq(editions.id, createPricingRuleDto.editionId))
      .limit(1)

    if (editionExists.length === 0) {
      throw new NotFoundException('指定された版が見つかりません')
    }

    await this.drizzleService.db.insert(pricingRules).values({
      editionId: createPricingRuleDto.editionId,
      ruleType: createPricingRuleDto.ruleType,
      name: createPricingRuleDto.name,
      price: createPricingRuleDto.price || null,
      discountRate: createPricingRuleDto.discountRate || null,
      minQuantity: createPricingRuleDto.minQuantity || null,
      eventId: createPricingRuleDto.eventId || null,
      validFrom: createPricingRuleDto.validFrom || null,
      validUntil: createPricingRuleDto.validUntil || null,
      priority: createPricingRuleDto.priority || 0,
      isActive: createPricingRuleDto.isActive !== false,
    })
  }

  // 価格ルール詳細
  @Get('pricing-rules/:id')
  @Render('pricing-rules/show')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.drizzleService.db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('価格ルールが見つかりません')
    }

    return {
      title: '価格ルール詳細',
      pricingRule: result[0],
    }
  }

  // 価格ルール編集フォーム
  @Get('pricing-rules/:id/edit')
  @Render('pricing-rules/edit')
  async renderEditForm(@Param('id', ParseIntPipe) id: number) {
    const result = await this.drizzleService.db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('価格ルールが見つかりません')
    }

    return {
      title: '価格ルール編集',
      pricingRule: result[0],
      formData: result[0],
    }
  }

  // HTTPメソッドオーバーライド対応（PUT/DELETE）
  @Post('pricing-rules/:id')
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
        metatype: UpdatePricingRuleDto,
      })
      await this.update(id, validatedDto)
      return res.redirect('/pricing-rules')
    }
    if (body._method === 'DELETE') {
      return this.remove(id, res)
    }
    res.status(404).send('Not Found')
  }

  // 価格ルール更新
  @Put('pricing-rules/:id')
  @UsePipes(ValidationPipe)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePricingRuleDto: UpdatePricingRuleDto,
  ) {
    // 存在確認
    const existing = await this.drizzleService.db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.id, id))
      .limit(1)

    if (existing.length === 0) {
      throw new NotFoundException('価格ルールが見つかりません')
    }

    await this.drizzleService.db
      .update(pricingRules)
      .set({
        editionId: updatePricingRuleDto.editionId,
        ruleType: updatePricingRuleDto.ruleType,
        name: updatePricingRuleDto.name,
        price: updatePricingRuleDto.price || null,
        discountRate: updatePricingRuleDto.discountRate || null,
        minQuantity: updatePricingRuleDto.minQuantity || null,
        eventId: updatePricingRuleDto.eventId || null,
        validFrom: updatePricingRuleDto.validFrom || null,
        validUntil: updatePricingRuleDto.validUntil || null,
        priority: updatePricingRuleDto.priority,
        isActive: updatePricingRuleDto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(pricingRules.id, id))
  }

  // 価格ルール削除
  @Delete('pricing-rules/:id')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // 存在確認
      const existing = await this.drizzleService.db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.id, id))
        .limit(1)

      if (existing.length === 0) {
        return res.status(404).send('価格ルールが見つかりませんでした')
      }

      await this.drizzleService.db
        .delete(pricingRules)
        .where(eq(pricingRules.id, id))

      res.redirect('/pricing-rules')
    } catch (error) {
      console.error('価格ルール削除エラー:', error)
      res.status(500).send('価格ルール削除中にエラーが発生しました')
    }
  }
}
