import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { editions, pricingRules } from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'

export interface PricingContext {
  eventId?: number
  transactionType?: string
  customerType?: string
}

export interface PriceCalculationResult {
  basePrice: number
  finalPrice: number
  totalDiscount: number
  appliedDiscounts: AppliedDiscount[]
  quantity: number
  subtotal: number
}

export interface AppliedDiscount {
  ruleName: string
  ruleType: string
  amount: number
  rate?: number
}

@Injectable()
export class PricingService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async calculatePrice(
    editionId: number,
    quantity: number,
    context: PricingContext,
  ): Promise<PriceCalculationResult> {
    // 1. ベース価格取得
    const edition = await this.getEditionBasePrice(editionId)
    const basePrice = edition.basePrice

    // 2. 適用可能な価格ルールを取得
    const applicableRules = await this.getApplicableRules(
      editionId,
      quantity,
      context,
    )

    // 3. 優先順位順にルールを適用
    let finalPrice = basePrice
    const appliedDiscounts: AppliedDiscount[] = []

    for (const rule of applicableRules) {
      const discount = this.applyPricingRule(
        basePrice,
        finalPrice,
        rule,
        quantity,
      )
      if (discount.amount > 0) {
        finalPrice -= discount.amount
        appliedDiscounts.push(discount)
      }
    }

    // 4. 負の価格を防ぐ
    finalPrice = Math.max(finalPrice, 0)

    return {
      basePrice,
      finalPrice,
      totalDiscount: appliedDiscounts.reduce((sum, d) => sum + d.amount, 0),
      appliedDiscounts,
      quantity,
      subtotal: finalPrice * quantity,
    }
  }

  private async getEditionBasePrice(editionId: number) {
    const result = await this.drizzleService.db
      .select()
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('版が見つかりません')
    }

    return result[0]
  }

  private async getApplicableRules(
    editionId: number,
    quantity: number,
    context: PricingContext,
  ) {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD形式

    const conditions = [
      eq(pricingRules.editionId, editionId),
      eq(pricingRules.isActive, true),
    ]

    // 日付範囲チェック: validFromが未設定またはtoday以前
    conditions.push(
      or(isNull(pricingRules.validFrom), lte(pricingRules.validFrom, today))!,
    )

    // 日付範囲チェック: validUntilが未設定またはtoday以降
    conditions.push(
      or(isNull(pricingRules.validUntil), gte(pricingRules.validUntil, today))!,
    )

    // 数量条件
    if (quantity) {
      conditions.push(
        or(
          isNull(pricingRules.minQuantity),
          lte(pricingRules.minQuantity, quantity),
        )!,
      )
    }

    // イベント条件
    if (context.eventId) {
      conditions.push(
        or(
          isNull(pricingRules.eventId),
          eq(pricingRules.eventId, context.eventId),
        )!,
      )
    }

    const query = this.drizzleService.db
      .select()
      .from(pricingRules)
      .where(and(...conditions))

    return query.orderBy(desc(pricingRules.priority))
  }

  private applyPricingRule(
    basePrice: number,
    currentPrice: number,
    rule: any,
    quantity: number,
  ): AppliedDiscount {
    let discountAmount = 0

    if (rule.price !== null) {
      // 固定価格の場合: ベース価格と固定価格の差額を割引額とする
      discountAmount = Math.max(0, basePrice - rule.price)
    } else if (rule.discountRate !== null) {
      // 割引率の場合: 現在価格に対して割引率を適用
      discountAmount = Math.floor((currentPrice * rule.discountRate) / 100)
    }

    return {
      ruleName: rule.name,
      ruleType: rule.ruleType,
      amount: discountAmount,
      rate: rule.discountRate,
    }
  }
}
