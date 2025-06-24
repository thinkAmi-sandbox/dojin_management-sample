import { Controller, Get, Query, Render } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import type { EventAnalyticsFilterDto } from './dto/event-analytics-filter.dto'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('events')
  @Render('analytics/events')
  async findEventAnalytics(@Query() filters: EventAnalyticsFilterDto) {
    const result = await this.analyticsService.findEventAnalytics(filters)

    // 金額フォーマット関数
    const formatCurrency = (amount: number | string | null) => {
      if (amount === null || amount === undefined || amount === '') return '-'
      const num = typeof amount === 'string' ? parseFloat(amount) : amount
      return Math.round(num).toLocaleString('ja-JP')
    }

    // 日付フォーマット関数
    const formatDate = (date: Date | string | null) => {
      if (!date) return '-'
      const d = typeof date === 'string' ? new Date(date) : date
      return d instanceof Date && !isNaN(d.getTime())
        ? d.toLocaleDateString('ja-JP')
        : '-'
    }

    // パーセンテージフォーマット関数
    const formatPercentage = (value: number | string | null) => {
      if (value === null || value === undefined) return '0.0'
      const num = typeof value === 'string' ? parseFloat(value) : value
      return num.toFixed(1)
    }

    // イベント統計の整形
    const eventStats = result.eventStats.map((event) => {
      const bookStat = result.eventBookStats.find(
        (book) => book.eventId === event.eventId,
      )

      return {
        eventId: event.eventId,
        eventName: event.eventName,
        eventDate: formatDate(event.eventDate),
        venue: event.venue || '',
        totalApplications: Number(event.totalApplications) || 0,
        acceptedCount: parseInt(String(event.acceptedCount)) || 0,
        rejectedCount: parseInt(String(event.rejectedCount)) || 0,
        appliedCount: parseInt(String(event.appliedCount)) || 0,
        cancelledCount: parseInt(String(event.cancelledCount)) || 0,
        totalBooks: Number(bookStat?.totalBooks) || 0,
        totalPlannedQuantity: Number(bookStat?.totalPlannedQuantity) || 0,
        expectedRevenue: formatCurrency(bookStat?.expectedRevenue || 0),
        detailUrl: `/events/${event.eventId}`,
      }
    })

    // 月別トレンドの整形
    const monthlyTrends = result.monthlyTrends.map((trend) => ({
      yearMonth: trend.yearMonth || '不明',
      applicationCount: trend.applicationCount || 0,
      acceptedCount: parseInt(String(trend.acceptedCount)) || 0,
    }))

    // サークル統計の整形
    const circleStats = result.circleStats.map((circle) => ({
      circleId: circle.circleId,
      circleName: circle.circleName,
      totalApplications: circle.totalApplications || 0,
      acceptedCount: parseInt(String(circle.acceptedCount)) || 0,
      successRate: formatPercentage(String(circle.successRate || 0)),
      detailUrl: `/circles/${circle.circleId}`,
    }))

    // 全体統計の計算
    const totalStats = {
      totalEvents: eventStats.length,
      totalApplications: eventStats.reduce(
        (sum, event) => sum + Number(event.totalApplications),
        0,
      ),
      totalAccepted: eventStats.reduce(
        (sum, event) => sum + Number(event.acceptedCount),
        0,
      ),
      totalRejected: eventStats.reduce(
        (sum, event) => sum + Number(event.rejectedCount),
        0,
      ),
      totalPending: eventStats.reduce(
        (sum, event) => sum + Number(event.appliedCount),
        0,
      ),
      totalBooks: eventStats.reduce(
        (sum, event) => sum + Number(event.totalBooks),
        0,
      ),
      totalPlannedQuantity: eventStats.reduce(
        (sum, event) => sum + Number(event.totalPlannedQuantity),
        0,
      ),
    }

    return {
      title: 'イベント別申込状況集計',
      eventStats,
      monthlyTrends,
      circleStats,
      totalStats,
      filters: {
        startDate: filters.startDate || '',
        endDate: filters.endDate || '',
        status: filters.status || '',
        year: filters.year || '',
      },
    }
  }
}
