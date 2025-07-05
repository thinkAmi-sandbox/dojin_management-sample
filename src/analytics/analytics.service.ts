import { Injectable } from '@nestjs/common'
import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import {
  events,
  books,
  circles,
  exhibitBooks,
  exhibitStatusEnum,
  exhibits,
} from '../db/schema'
import { DrizzleService } from '../drizzle/drizzle.service'
import type { CircleAnalyticsFilterDto } from './dto/circle-analytics-filter.dto'
import type { EventAnalyticsFilterDto } from './dto/event-analytics-filter.dto'

@Injectable()
export class AnalyticsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findEventAnalytics(filters: EventAnalyticsFilterDto) {
    // 基本的な条件
    const conditions = []

    // 日付フィルタリング（文字列で比較）
    if (filters.startDate) {
      conditions.push(gte(events.eventDate, filters.startDate))
    }
    if (filters.endDate) {
      conditions.push(lte(events.eventDate, filters.endDate))
    }

    // 年度フィルタリング
    if (filters.year) {
      const year = parseInt(filters.year, 10)
      conditions.push(
        and(
          gte(events.eventDate, `${year}-01-01`),
          lte(events.eventDate, `${year}-12-31`),
        ),
      )
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined

    // イベント別申込状況集計
    const eventStats = await this.drizzleService.db
      .select({
        eventId: events.id,
        eventName: events.name,
        eventDate: events.eventDate,
        venue: events.venue,
        totalApplications: count(exhibits.id),
        acceptedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)`.as(
            'acceptedCount',
          ),
        rejectedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'rejected' THEN 1 ELSE 0 END)`.as(
            'rejectedCount',
          ),
        appliedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'applied' THEN 1 ELSE 0 END)`.as(
            'appliedCount',
          ),
        cancelledCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'cancelled' THEN 1 ELSE 0 END)`.as(
            'cancelledCount',
          ),
      })
      .from(events)
      .leftJoin(exhibits, eq(events.id, exhibits.eventId))
      .where(whereCondition)
      .groupBy(events.id, events.name, events.eventDate, events.venue)
      .orderBy(desc(events.eventDate))

    // 各イベントの書籍情報集計
    const eventBookStats = await this.drizzleService.db
      .select({
        eventId: events.id,
        totalBooks: count(exhibitBooks.editionId),
        totalPlannedQuantity: sum(exhibitBooks.plannedQuantity),
        expectedRevenue: sum(
          sql`${exhibitBooks.plannedQuantity} * ${exhibitBooks.price}`,
        ),
      })
      .from(events)
      .leftJoin(exhibits, eq(events.id, exhibits.eventId))
      .leftJoin(exhibitBooks, eq(exhibits.id, exhibitBooks.exhibitId))
      .where(whereCondition)
      .groupBy(events.id)

    // 月別申込トレンド
    const monthlyTrends = await this.drizzleService.db
      .select({
        yearMonth: sql`TO_CHAR(${exhibits.applicationDate}, 'YYYY-MM')`.as(
          'yearMonth',
        ),
        applicationCount: count(exhibits.id),
        acceptedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)`.as(
            'acceptedCount',
          ),
      })
      .from(exhibits)
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .where(whereCondition)
      .groupBy(sql`TO_CHAR(${exhibits.applicationDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${exhibits.applicationDate}, 'YYYY-MM') DESC`)

    // サークル別申込実績
    const circleStats = await this.drizzleService.db
      .select({
        circleId: circles.id,
        circleName: circles.name,
        totalApplications: count(exhibits.id),
        acceptedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)`.as(
            'acceptedCount',
          ),
        successRate: sql`ROUND(
          CASE 
            WHEN COUNT(${exhibits.id}) > 0 
            THEN (SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)::decimal / COUNT(${exhibits.id}) * 100)
            ELSE 0 
          END, 2
        )`.as('successRate'),
      })
      .from(circles)
      .leftJoin(exhibits, eq(circles.id, exhibits.circleId))
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .where(whereCondition)
      .groupBy(circles.id, circles.name)
      .having(sql`COUNT(${exhibits.id}) > 0`)
      .orderBy(desc(sql`COUNT(${exhibits.id})`))

    return {
      eventStats,
      eventBookStats,
      monthlyTrends,
      circleStats,
    }
  }

  async findCircleAnalytics(filters: CircleAnalyticsFilterDto) {
    // 基本的な条件
    const conditions = []

    // 日付フィルタリング（出展申込日基準）
    if (filters.startDate) {
      conditions.push(
        gte(exhibits.applicationDate, new Date(filters.startDate)),
      )
    }
    if (filters.endDate) {
      conditions.push(lte(exhibits.applicationDate, new Date(filters.endDate)))
    }

    // 年度フィルタリング（イベント開催日基準）
    if (filters.year) {
      const year = parseInt(filters.year, 10)
      conditions.push(
        and(
          gte(events.eventDate, `${year}-01-01`),
          lte(events.eventDate, `${year}-12-31`),
        ),
      )
    }

    // ステータスフィルタリング
    if (filters.status) {
      conditions.push(
        eq(
          exhibits.status,
          filters.status as (typeof exhibitStatusEnum.enumValues)[number],
        ),
      )
    }

    // イベント名フィルタリング
    if (filters.eventName) {
      conditions.push(sql`${events.name} ILIKE ${`%${filters.eventName}%`}`)
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined

    // サークル別出展実績集計
    const circleStats = await this.drizzleService.db
      .select({
        circleId: circles.id,
        circleName: circles.name,
        representativeName: circles.representativeName,
        email: circles.email,
        totalApplications: count(exhibits.id),
        acceptedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)`.as(
            'acceptedCount',
          ),
        rejectedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'rejected' THEN 1 ELSE 0 END)`.as(
            'rejectedCount',
          ),
        appliedCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'applied' THEN 1 ELSE 0 END)`.as(
            'appliedCount',
          ),
        cancelledCount:
          sql`SUM(CASE WHEN ${exhibits.status} = 'cancelled' THEN 1 ELSE 0 END)`.as(
            'cancelledCount',
          ),
        successRate: sql`ROUND(
          CASE 
            WHEN COUNT(${exhibits.id}) > 0 
            THEN (SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)::decimal / COUNT(${exhibits.id}) * 100)
            ELSE 0 
          END, 2
        )`.as('successRate'),
      })
      .from(circles)
      .leftJoin(exhibits, eq(circles.id, exhibits.circleId))
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .where(whereCondition)
      .groupBy(
        circles.id,
        circles.name,
        circles.representativeName,
        circles.email,
      )
      .having(sql`COUNT(${exhibits.id}) > 0`)
      .orderBy(desc(sql`COUNT(${exhibits.id})`))

    // サークル別書籍・収益統計
    const circleBookStats = await this.drizzleService.db
      .select({
        circleId: circles.id,
        totalBooks: count(exhibitBooks.editionId),
        totalPlannedQuantity: sum(exhibitBooks.plannedQuantity),
        expectedRevenue: sum(
          sql`${exhibitBooks.plannedQuantity} * ${exhibitBooks.price}`,
        ),
        averageBookPrice: sql`ROUND(
          CASE 
            WHEN COUNT(${exhibitBooks.editionId}) > 0 
            THEN AVG(${exhibitBooks.price})
            ELSE 0 
          END, 0
        )`.as('averageBookPrice'),
      })
      .from(circles)
      .leftJoin(exhibits, eq(circles.id, exhibits.circleId))
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .leftJoin(exhibitBooks, eq(exhibits.id, exhibitBooks.exhibitId))
      .where(whereCondition)
      .groupBy(circles.id)

    // サークル別イベント参加履歴
    const circleEventHistory = await this.drizzleService.db
      .select({
        circleId: circles.id,
        eventId: events.id,
        eventName: events.name,
        eventDate: events.eventDate,
        status: exhibits.status,
        spaceNumber: exhibits.spaceNumber,
        spaceType: exhibits.spaceType,
        bookCount: count(exhibitBooks.editionId),
        totalPlannedQuantity: sum(exhibitBooks.plannedQuantity),
        eventRevenue: sum(
          sql`${exhibitBooks.plannedQuantity} * ${exhibitBooks.price}`,
        ),
      })
      .from(circles)
      .leftJoin(exhibits, eq(circles.id, exhibits.circleId))
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .leftJoin(exhibitBooks, eq(exhibits.id, exhibitBooks.exhibitId))
      .where(whereCondition)
      .groupBy(
        circles.id,
        events.id,
        events.name,
        events.eventDate,
        exhibits.status,
        exhibits.spaceNumber,
        exhibits.spaceType,
      )
      .orderBy(desc(events.eventDate))

    // 全体統計情報
    const overallStats = await this.drizzleService.db
      .select({
        totalCircles: sql`COUNT(DISTINCT ${circles.id})`.as('totalCircles'),
        totalApplications: count(exhibits.id),
        totalAccepted:
          sql`SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)`.as(
            'totalAccepted',
          ),
        overallSuccessRate: sql`ROUND(
          CASE 
            WHEN COUNT(${exhibits.id}) > 0 
            THEN (SUM(CASE WHEN ${exhibits.status} = 'accepted' THEN 1 ELSE 0 END)::decimal / COUNT(${exhibits.id}) * 100)
            ELSE 0 
          END, 2
        )`.as('overallSuccessRate'),
        totalExpectedRevenue: sum(
          sql`${exhibitBooks.plannedQuantity} * ${exhibitBooks.price}`,
        ),
      })
      .from(circles)
      .leftJoin(exhibits, eq(circles.id, exhibits.circleId))
      .leftJoin(events, eq(exhibits.eventId, events.id))
      .leftJoin(exhibitBooks, eq(exhibits.id, exhibitBooks.exhibitId))
      .where(whereCondition)

    return {
      circleStats,
      circleBookStats,
      circleEventHistory,
      overallStats,
    }
  }
}
