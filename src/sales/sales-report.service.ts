import { Injectable } from '@nestjs/common'
import {
  and,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import {
  events,
  books,
  editions,
  salesDetails,
  salesTransactions,
  storageLocations,
} from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import type { SalesReportFilters } from './dto/sales-report-filters.dto'

export interface SalesSummary {
  totalTransactions: number
  totalQuantity: number
  totalAmount: number
  averageTransactionAmount: number
}

export interface EditionSalesData {
  editionId: number
  bookTitle: string
  editionName: string
  basePrice: number
  totalQuantity: number
  totalAmount: number
  transactionCount: number
  averagePrice: number
}

export interface PeriodSalesData {
  period: string
  totalQuantity: number
  totalAmount: number
  transactionCount: number
}

export interface ChannelSalesData {
  transactionType: string
  totalQuantity: number
  totalAmount: number
  transactionCount: number
}

export interface EventSalesData {
  eventId: number
  eventName: string
  eventDate: Date | string
  totalQuantity: number
  totalAmount: number
  transactionCount: number
}

export interface SalesReportData {
  summary: SalesSummary
  byEdition: EditionSalesData[]
  byPeriod: PeriodSalesData[]
  byChannel: ChannelSalesData[]
  byEvent: EventSalesData[]
}

@Injectable()
export class SalesReportService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async generateSalesReport(
    filters: SalesReportFilters,
  ): Promise<SalesReportData> {
    const reportData: SalesReportData = {
      summary: await this.getSalesSummary(filters),
      byEdition: await this.getSalesByEdition(filters),
      byPeriod: await this.getSalesByPeriod(filters),
      byChannel: await this.getSalesByChannel(filters),
      byEvent: await this.getSalesByEvent(filters),
    }

    return reportData
  }

  private async getSalesSummary(
    filters: SalesReportFilters,
  ): Promise<SalesSummary> {
    const result = await this.drizzleService.db
      .select({
        totalTransactions: sql<number>`COUNT(DISTINCT ${salesTransactions.id})::integer`,
        totalQuantity: sql<number>`COALESCE(SUM(${salesDetails.quantity}), 0)::integer`,
        totalAmount: sql<number>`COALESCE(SUM(${salesDetails.subtotal}), 0)::integer`,
        averageTransactionAmount: sql<number>`COALESCE(AVG(${salesTransactions.finalAmount}), 0)::integer`,
      })
      .from(salesTransactions)
      .innerJoin(
        salesDetails,
        eq(salesTransactions.id, salesDetails.transactionId),
      )
      .where(this.buildDateFilter(filters))

    return (
      result[0] || {
        totalTransactions: 0,
        totalQuantity: 0,
        totalAmount: 0,
        averageTransactionAmount: 0,
      }
    )
  }

  private async getSalesByEdition(
    filters: SalesReportFilters,
  ): Promise<EditionSalesData[]> {
    return await this.drizzleService.db
      .select({
        editionId: salesDetails.editionId,
        bookTitle: books.title,
        editionName: editions.versionName,
        basePrice: editions.basePrice,
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})::integer`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesDetails.transactionId})::integer`,
        averagePrice: sql<number>`AVG(${salesDetails.unitPrice})::integer`,
      })
      .from(salesDetails)
      .innerJoin(
        salesTransactions,
        eq(salesDetails.transactionId, salesTransactions.id),
      )
      .innerJoin(editions, eq(salesDetails.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(this.buildDateFilter(filters))
      .groupBy(
        salesDetails.editionId,
        books.title,
        editions.versionName,
        editions.basePrice,
      )
      .orderBy(desc(sql`SUM(${salesDetails.subtotal})`))
  }

  private async getSalesByPeriod(
    filters: SalesReportFilters,
  ): Promise<PeriodSalesData[]> {
    const groupBy = filters.groupBy || 'day' // day, week, month

    const dateFormat = {
      day: `to_char(date_trunc('day', "SalesTransaction"."transactionDate"), 'YYYY-MM-DD')`,
      week: `to_char(date_trunc('week', "SalesTransaction"."transactionDate"), 'YYYY-MM-DD')`,
      month: `to_char(date_trunc('month', "SalesTransaction"."transactionDate"), 'YYYY-MM')`,
    }[groupBy]

    return await this.drizzleService.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        totalQuantity: sql<number>`COALESCE(SUM(${salesDetails.quantity}), 0)::integer`,
        totalAmount: sql<number>`COALESCE(SUM(${salesDetails.subtotal}), 0)::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.id})::integer`,
      })
      .from(salesTransactions)
      .innerJoin(
        salesDetails,
        eq(salesTransactions.id, salesDetails.transactionId),
      )
      .where(this.buildDateFilter(filters))
      .groupBy(sql.raw(dateFormat))
      .orderBy(sql.raw(dateFormat))
  }

  private async getSalesByChannel(
    filters: SalesReportFilters,
  ): Promise<ChannelSalesData[]> {
    return await this.drizzleService.db
      .select({
        transactionType: salesTransactions.transactionType,
        totalQuantity: sql<number>`COALESCE(SUM(${salesDetails.quantity}), 0)::integer`,
        totalAmount: sql<number>`COALESCE(SUM(${salesDetails.subtotal}), 0)::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.id})::integer`,
      })
      .from(salesTransactions)
      .innerJoin(
        salesDetails,
        eq(salesTransactions.id, salesDetails.transactionId),
      )
      .where(this.buildDateFilter(filters))
      .groupBy(salesTransactions.transactionType)
      .orderBy(desc(sql`SUM(${salesDetails.subtotal})`))
  }

  private async getSalesByEvent(
    filters: SalesReportFilters,
  ): Promise<EventSalesData[]> {
    const eventSales = await this.drizzleService.db
      .select({
        eventId: salesTransactions.eventId,
        eventName: events.name,
        eventDate: events.eventDate,
        totalQuantity: sql<number>`COALESCE(SUM(${salesDetails.quantity}), 0)::integer`,
        totalAmount: sql<number>`COALESCE(SUM(${salesDetails.subtotal}), 0)::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.id})::integer`,
      })
      .from(salesTransactions)
      .innerJoin(
        salesDetails,
        eq(salesTransactions.id, salesDetails.transactionId),
      )
      .innerJoin(events, eq(salesTransactions.eventId, events.id))
      .where(
        and(
          isNotNull(salesTransactions.eventId),
          this.buildDateFilter(filters),
        ),
      )
      .groupBy(salesTransactions.eventId, events.name, events.eventDate)
      .orderBy(desc(sql`SUM(${salesDetails.subtotal})`))

    // eventIdがnullのレコードは除外されているので、型アサーションを使用
    return eventSales.map((e) => ({
      ...e,
      eventId: e.eventId as number,
    }))
  }

  async getTopSellingEditions(
    filters: SalesReportFilters & { limit?: number },
  ): Promise<EditionSalesData[]> {
    const query = this.drizzleService.db
      .select({
        editionId: salesDetails.editionId,
        bookTitle: books.title,
        editionName: editions.versionName,
        basePrice: editions.basePrice,
        totalQuantity: sql<number>`SUM(${salesDetails.quantity})::integer`,
        totalAmount: sql<number>`SUM(${salesDetails.subtotal})::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesDetails.transactionId})::integer`,
        averagePrice: sql<number>`AVG(${salesDetails.unitPrice})::integer`,
      })
      .from(salesDetails)
      .innerJoin(
        salesTransactions,
        eq(salesDetails.transactionId, salesTransactions.id),
      )
      .innerJoin(editions, eq(salesDetails.editionId, editions.id))
      .innerJoin(books, eq(editions.bookId, books.id))
      .where(this.buildDateFilter(filters))
      .groupBy(
        salesDetails.editionId,
        books.title,
        editions.versionName,
        editions.basePrice,
      )
      .orderBy(desc(sql`SUM(${salesDetails.quantity})`))

    if (filters.limit) {
      return await query.limit(filters.limit)
    }

    return await query
  }

  async getSalesTrendData(filters: SalesReportFilters) {
    const groupBy = filters.groupBy || 'day'

    const dateFormat = {
      day: `to_char(date_trunc('day', "SalesTransaction"."transactionDate"), 'YYYY-MM-DD')`,
      week: `to_char(date_trunc('week', "SalesTransaction"."transactionDate"), 'YYYY WW')`,
      month: `to_char(date_trunc('month', "SalesTransaction"."transactionDate"), 'YYYY-MM')`,
    }[groupBy]

    const trends = await this.drizzleService.db
      .select({
        period: sql<string>`${sql.raw(dateFormat)}`,
        totalQuantity: sql<number>`COALESCE(SUM(${salesDetails.quantity}), 0)::integer`,
        totalAmount: sql<number>`COALESCE(SUM(${salesDetails.subtotal}), 0)::integer`,
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.id})::integer`,
      })
      .from(salesTransactions)
      .innerJoin(
        salesDetails,
        eq(salesTransactions.id, salesDetails.transactionId),
      )
      .where(this.buildDateFilter(filters))
      .groupBy(sql.raw(dateFormat))
      .orderBy(sql.raw(dateFormat))

    // Chart.js形式のデータに変換
    return {
      labels: trends.map((t) => t.period),
      datasets: [
        {
          label: '売上金額',
          data: trends.map((t) => t.totalAmount),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
        {
          label: '販売数量',
          data: trends.map((t) => t.totalQuantity),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    }
  }

  private buildDateFilter(filters: SalesReportFilters) {
    const conditions = []

    // 日付フィルタリング - 無効な日付はスキップ
    if (filters.startDate) {
      try {
        const startDate = new Date(filters.startDate)
        if (!isNaN(startDate.getTime())) {
          conditions.push(gte(salesTransactions.transactionDate, startDate))
        }
      } catch {
        // 無効な日付は無視
      }
    }

    if (filters.endDate) {
      try {
        const endDate = new Date(filters.endDate)
        if (!isNaN(endDate.getTime())) {
          // 終了日の23:59:59まで含める
          endDate.setHours(23, 59, 59, 999)
          conditions.push(lte(salesTransactions.transactionDate, endDate))
        }
      } catch {
        // 無効な日付は無視
      }
    }

    if (filters.transactionType) {
      conditions.push(
        eq(salesTransactions.transactionType, filters.transactionType),
      )
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }

  // エクスポート用のデータフォーマット
  async exportReportData(filters: SalesReportFilters, format: 'json' | 'csv') {
    const reportData = await this.generateSalesReport(filters)

    if (format === 'json') {
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          filters: filters,
        },
        data: {
          summary: reportData.summary,
          details: reportData,
        },
      }
    }

    // CSV形式は後で実装予定
    throw new Error('CSV export not implemented yet')
  }
}
