import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Settlement Analytics Integration Tests', () => {
  let app: INestApplication
  let testConsignment1: schema.Consignment
  let testConsignment2: schema.Consignment
  let testEdition: schema.Edition

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()

    // テストデータ作成
    const book = await testDbUtils.createTestBook()
    testEdition = await testDbUtils.createTestEdition(book.id, {
      basePrice: 1000,
    })

    const location1 = await testDbUtils.createTestStorageLocation({
      type: 'consignment',
      isConsignment: true,
      name: '東京書店',
    })

    const location2 = await testDbUtils.createTestStorageLocation({
      type: 'consignment',
      isConsignment: true,
      name: '大阪書店',
    })

    testConsignment1 = await testDbUtils.createTestConsignment({
      locationId: location1.id,
      storeName: '東京書店',
      commissionRate: 30,
    })

    testConsignment2 = await testDbUtils.createTestConsignment({
      locationId: location2.id,
      storeName: '大阪書店',
      commissionRate: 25,
    })
  })

  describe('委託先別収益分析', () => {
    it('委託先別の収益ランキングを取得できること', async () => {
      // 委託先1の販売データ
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 100000,
        status: 'settled',
      })
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 50000,
        status: 'settled',
      })

      // 委託先2の販売データ
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment2.id,
        totalSalesAmount: 80000,
        status: 'settled',
      })

      const response = await request(app.getHttpServer())
        .get('/consignments/analytics/revenue-ranking')
        .query({
          periodStart: '2025-01-01',
          periodEnd: '2025-12-31',
        })
        .expect(200)

      expect(response.body.ranking).toHaveLength(2)
      expect(response.body.ranking[0]).toMatchObject({
        consignmentId: testConsignment1.id,
        storeName: '東京書店',
        totalRevenue: 150000,
        totalCommission: 45000,
        netRevenue: 105000,
      })
      expect(response.body.ranking[1]).toMatchObject({
        consignmentId: testConsignment2.id,
        storeName: '大阪書店',
        totalRevenue: 80000,
        totalCommission: 24000, // 30% commission
        netRevenue: 56000,
      })
    })

    it('委託先別の販売トレンドを取得できること', async () => {
      // 3ヶ月分のデータを作成
      for (let month = 1; month <= 3; month++) {
        await testDbUtils.createTestConsignmentSalesReport({
          consignmentId: testConsignment1.id,
          reportPeriodStart: new Date(`2025-0${month}-01`),
          reportPeriodEnd: new Date(`2025-0${month}-${month === 2 ? 28 : 31}`),
          totalSalesAmount: 50000 + month * 10000, // 増加トレンド
          status: 'settled',
        })
      }

      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment1.id}/analytics/sales-trend`)
        .query({
          year: 2025,
          groupBy: 'month',
        })
        .expect(200)

      expect(response.body.trend).toHaveLength(3)
      expect(response.body.trend[0].salesAmount).toBe(60000)
      expect(response.body.trend[1].salesAmount).toBe(70000)
      expect(response.body.trend[2].salesAmount).toBe(80000)
      expect(response.body.growthRate).toBeGreaterThan(0)
    })
  })

  describe('版別販売分析', () => {
    it('委託先での版別売上ランキングを取得できること', async () => {
      const book2 = await testDbUtils.createTestBook()
      const edition2 = await testDbUtils.createTestEdition(book2.id, {
        basePrice: 1500,
      })

      // 販売報告を作成
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 35000,
        status: 'settled',
      })

      // 販売明細を追加
      await testDbUtils.drizzleDb
        .insert(schema.consignmentSalesDetails)
        .values([
          {
            consignmentSalesId: salesReport.id,
            editionId: testEdition.id,
            quantity: 20,
            unitPrice: 1000,
            subtotal: 20000,
          },
          {
            consignmentSalesId: salesReport.id,
            editionId: edition2.id,
            quantity: 10,
            unitPrice: 1500,
            subtotal: 15000,
          },
        ])

      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment1.id}/analytics/edition-ranking`)
        .query({ limit: 10 })
        .expect(200)

      expect(response.body.editions).toHaveLength(2)
      expect(response.body.editions[0]).toMatchObject({
        editionId: testEdition.id,
        totalQuantity: 20,
        totalRevenue: 20000,
      })
    })

    it('版別の委託先別パフォーマンスを比較できること', async () => {
      // 同じ版を複数の委託先で販売
      const salesReport1 = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 20000,
        status: 'settled',
      })

      const salesReport2 = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment2.id,
        totalSalesAmount: 15000,
        status: 'settled',
      })

      // 販売明細を追加
      await testDbUtils.drizzleDb
        .insert(schema.consignmentSalesDetails)
        .values([
          {
            consignmentSalesId: salesReport1.id,
            editionId: testEdition.id,
            quantity: 20,
            unitPrice: 1000,
            subtotal: 20000,
          },
          {
            consignmentSalesId: salesReport2.id,
            editionId: testEdition.id,
            quantity: 15,
            unitPrice: 1000,
            subtotal: 15000,
          },
        ])

      const response = await request(app.getHttpServer())
        .get(`/editions/${testEdition.id}/consignment-performance`)
        .expect(200)

      expect(response.body.consignments).toHaveLength(2)
      expect(response.body.bestPerformer).toMatchObject({
        consignmentId: testConsignment1.id,
        storeName: '東京書店',
        salesQuantity: 20,
      })
    })
  })

  describe('精算効率分析', () => {
    it('精算サイクル分析レポートを取得できること', async () => {
      // 様々な精算状態のデータを作成
      const now = new Date('2025-07-05T10:00:00Z')

      // 迅速に精算されたケース
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 50000,
        status: 'settled',
        reportedAt: new Date('2025-06-30T10:00:00Z'), // 5日前
        settledAt: now,
      })

      // 精算に時間がかかったケース
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 30000,
        status: 'settled',
        reportedAt: new Date('2025-06-05T10:00:00Z'), // 30日前
        settledAt: now,
      })

      // 未精算のケース
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment1.id,
        totalSalesAmount: 20000,
        status: 'confirmed',
        reportedAt: new Date('2025-05-21T10:00:00Z'), // 45日前
      })

      const response = await request(app.getHttpServer())
        .get(
          `/consignments/${testConsignment1.id}/analytics/settlement-efficiency`,
        )
        .expect(200)

      expect(response.body).toMatchObject({
        averageSettlementDays: 17.5, // (5 + 30) / 2
        settledCount: 2,
        pendingCount: 1,
        pendingAmount: 20000,
        oldestPendingDays: 45,
      })
    })

    it('手数料率の影響分析ができること', async () => {
      const response = await request(app.getHttpServer())
        .get('/consignments/analytics/commission-analysis')
        .query({
          simulateRates: [20, 25, 30, 35],
          periodStart: '2025-01-01',
          periodEnd: '2025-12-31',
        })
        .expect(200)

      expect(response.body.scenarios).toHaveLength(4)
      expect(response.body.currentAverageRate).toBeDefined()
      expect(response.body.optimalRate).toBeDefined()
    })
  })

  describe('ダッシュボード用統計データ', () => {
    it('全体統計サマリーを取得できること', async () => {
      const response = await request(app.getHttpServer())
        .get('/consignments/analytics/dashboard-summary')
        .expect(200)

      expect(response.body).toMatchObject({
        totalConsignments: 2,
        activeConsignments: 2,
        totalSalesAmount: expect.any(Number),
        totalCommissionAmount: expect.any(Number),
        totalNetAmount: expect.any(Number),
        pendingSettlementAmount: expect.any(Number),
        thisMonthSales: expect.any(Number),
        lastMonthSales: expect.any(Number),
        monthOverMonthGrowth: expect.any(Number),
      })
    })

    it('委託先別KPIを取得できること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment1.id}/analytics/kpi`)
        .expect(200)

      expect(response.body).toMatchObject({
        salesPerMonth: expect.any(Number),
        averageOrderValue: expect.any(Number),
        settlementEfficiency: expect.any(Number),
        returnRate: expect.any(Number),
        topSellingEditions: expect.any(Array),
      })
    })
  })
})
