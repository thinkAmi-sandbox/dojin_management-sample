import { Controller, Get, Query, Render } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import type { EventAnalyticsFilterDto } from './dto/event-analytics-filter.dto'
import type { CircleAnalyticsFilterDto } from './dto/circle-analytics-filter.dto'

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

  @Get('circles')
  @Render('analytics/circles')
  async findCircleAnalytics(@Query() filters: CircleAnalyticsFilterDto) {
    const result = await this.analyticsService.findCircleAnalytics(filters)

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

    // サークル統計の整形
    const circleStats = result.circleStats.map((circle) => {
      const bookStat = result.circleBookStats.find(
        (book) => book.circleId === circle.circleId,
      )

      return {
        circleId: circle.circleId,
        circleName: circle.circleName,
        representativeName: circle.representativeName,
        email: circle.email || '',
        totalApplications: Number(circle.totalApplications) || 0,
        acceptedCount: parseInt(String(circle.acceptedCount)) || 0,
        rejectedCount: parseInt(String(circle.rejectedCount)) || 0,
        appliedCount: parseInt(String(circle.appliedCount)) || 0,
        cancelledCount: parseInt(String(circle.cancelledCount)) || 0,
        successRate: formatPercentage(String(circle.successRate || 0)),
        totalBooks: Number(bookStat?.totalBooks) || 0,
        totalPlannedQuantity: Number(bookStat?.totalPlannedQuantity) || 0,
        expectedRevenue: formatCurrency(bookStat?.expectedRevenue || 0),
        averageBookPrice: formatCurrency(
          Number(bookStat?.averageBookPrice) || 0,
        ),
        detailUrl: `/circles/${circle.circleId}`,
      }
    })

    // イベント参加履歴の整形
    const eventHistory = result.circleEventHistory.map((history) => ({
      circleId: history.circleId,
      eventId: history.eventId,
      eventName: history.eventName,
      eventDate: formatDate(history.eventDate),
      status: history.status,
      spaceNumber: history.spaceNumber || '-',
      spaceType: history.spaceType || '-',
      bookCount: Number(history.bookCount) || 0,
      totalPlannedQuantity: Number(history.totalPlannedQuantity) || 0,
      eventRevenue: formatCurrency(history.eventRevenue || 0),
    }))

    // 全体統計の整形
    const overallStats = result.overallStats[0] || {}
    const totalStats = {
      totalCircles: Number(overallStats.totalCircles) || 0,
      totalApplications: Number(overallStats.totalApplications) || 0,
      totalAccepted: parseInt(String(overallStats.totalAccepted)) || 0,
      overallSuccessRate: formatPercentage(
        String(overallStats.overallSuccessRate || 0),
      ),
      totalExpectedRevenue: formatCurrency(
        overallStats.totalExpectedRevenue || 0,
      ),
    }

    return {
      title: 'サークル別出展実績分析',
      circleStats,
      eventHistory,
      totalStats,
      filters: {
        startDate: filters.startDate || '',
        endDate: filters.endDate || '',
        status: filters.status || '',
        year: filters.year || '',
        eventName: filters.eventName || '',
      },
    }
  }
}
