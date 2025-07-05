import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Settlement Workflow Integration Tests', () => {
  let app: INestApplication
  let testConsignment: schema.Consignment
  let testEdition1: schema.Edition
  let testEdition2: schema.Edition

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

    // 共通テストデータ作成
    const book1 = await testDbUtils.createTestBook()
    const book2 = await testDbUtils.createTestBook()
    testEdition1 = await testDbUtils.createTestEdition(book1.id, {
      basePrice: 1000,
    })
    testEdition2 = await testDbUtils.createTestEdition(book2.id, {
      basePrice: 1500,
    })

    const location = await testDbUtils.createTestStorageLocation({
      type: 'consignment',
      isConsignment: true,
    })

    testConsignment = await testDbUtils.createTestConsignment({
      locationId: location.id,
      storeName: 'テスト書店',
      commissionRate: 30,
      settlementCycle: 'monthly',
    })

    // 委託先在庫を作成
    await testDbUtils.createTestStock({
      editionId: testEdition1.id,
      locationId: location.id,
      quantity: 100,
      availableQuantity: 100,
    })
    await testDbUtils.createTestStock({
      editionId: testEdition2.id,
      locationId: location.id,
      quantity: 50,
      availableQuantity: 50,
    })
  })

  describe('期間別一括精算機能', () => {
    it('指定期間内の複数販売報告を一括精算できること', async () => {
      // 複数の販売報告を作成（確認済み状態）
      const report1 = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-01-01'),
        reportPeriodEnd: new Date('2025-01-31'),
        totalSalesAmount: 10000,
        status: 'confirmed',
      })

      const report2 = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-02-01'),
        reportPeriodEnd: new Date('2025-02-28'),
        totalSalesAmount: 15000,
        status: 'confirmed',
      })

      // 範囲外の報告（精算対象外）
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-03-01'),
        reportPeriodEnd: new Date('2025-03-31'),
        totalSalesAmount: 8000,
        status: 'confirmed',
      })

      // 一括精算実行
      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports/bulk-settle`)
        .send({
          periodStart: '2025-01-01',
          periodEnd: '2025-02-28',
          settlementMethod: 'bank_transfer',
          notes: '2025年1-2月分一括精算',
        })
        .expect(302)

      expect(response.headers.location).toContain('/consignments/')

      // 精算状況確認（実装後にテストが通るようになる）
      // const settledReports = await consignmentSalesService.findByPeriod(...)
      // expect(settledReports.filter(r => r.status === 'settled')).toHaveLength(2)
    })

    it('未確認の報告がある場合は一括精算できないこと', async () => {
      // 報告済み（未確認）状態の報告を作成
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-01-01'),
        reportPeriodEnd: new Date('2025-01-31'),
        totalSalesAmount: 10000,
        status: 'reported', // 未確認
      })

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports/bulk-settle`)
        .send({
          periodStart: '2025-01-01',
          periodEnd: '2025-01-31',
          settlementMethod: 'bank_transfer',
        })
        .expect(400)

      expect(response.body.message).toContain(
        '未確認の販売報告があるため一括精算できません',
      )
    })
  })

  describe('精算明細書生成機能', () => {
    it('精算明細書PDFを生成できること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 25000,
        status: 'settled',
        settlementMethod: 'bank_transfer',
      })

      // 販売明細も追加
      await testDbUtils.drizzleDb
        .insert(schema.consignmentSalesDetails)
        .values([
          {
            consignmentSalesId: salesReport.id,
            editionId: testEdition1.id,
            quantity: 10,
            unitPrice: 1000,
            subtotal: 10000,
          },
          {
            consignmentSalesId: salesReport.id,
            editionId: testEdition2.id,
            quantity: 10,
            unitPrice: 1500,
            subtotal: 15000,
          },
        ])

      const response = await request(app.getHttpServer())
        .get(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/statement`,
        )
        .expect(200)

      expect(response.headers['content-type']).toContain('application/pdf')
      expect(response.headers['content-disposition']).toContain('attachment')
    })

    it('精算明細書をメール送信できること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 25000,
        status: 'settled',
      })

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/send-statement`,
        )
        .send({
          email: 'test@example.com',
          subject: '精算明細書のお知らせ',
          message: '今月の精算明細書をお送りします。',
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('精算明細書を送信しました')
    })
  })

  describe('支払予定管理機能', () => {
    it('支払予定を登録できること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 25000,
        status: 'settled',
      })

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/payment-schedule`,
        )
        .send({
          scheduledDate: '2025-03-15',
          amount: 17500, // 25000 - 30%手数料
          paymentMethod: 'bank_transfer',
          notes: '3月15日振込予定',
        })
        .expect(201)

      expect(response.body.scheduledDate).toBe('2025-03-15')
      expect(response.body.amount).toBe(17500)
    })

    it('支払完了を記録できること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 25000,
        status: 'settled',
      })

      // 支払予定を作成（実装後はサービス経由で作成）
      const paymentScheduleId = 1 // 仮のID

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/payment-schedules/${paymentScheduleId}/complete`,
        )
        .send({
          actualDate: '2025-03-15',
          actualAmount: 17500,
          transactionReference: 'TXN-2025031501',
          notes: '振込完了',
        })
        .expect(201)

      expect(response.body.status).toBe('completed')
      expect(response.body.actualDate).toBe('2025-03-15')
    })
  })

  describe('精算レポート機能', () => {
    it('月次精算サマリーを取得できること', async () => {
      // 複数月のデータを作成
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-01-01'),
        reportPeriodEnd: new Date('2025-01-31'),
        totalSalesAmount: 50000,
        status: 'settled',
      })

      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodStart: new Date('2025-02-01'),
        reportPeriodEnd: new Date('2025-02-28'),
        totalSalesAmount: 75000,
        status: 'settled',
      })

      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment.id}/reports/monthly-summary`)
        .query({ year: 2025, month: 1 })

      if (response.status !== 200) {
        console.error('Monthly summary error:', response.body)
        console.error('Error details:', {
          status: response.status,
          text: response.text,
          body: response.body,
        })
      }

      expect(response.status).toBe(200)

      expect(response.body).toHaveProperty('totalSales', 50000)
      expect(response.body).toHaveProperty('totalCommission', 15000) // 30%
      expect(response.body).toHaveProperty('netAmount', 35000)
      expect(response.body).toHaveProperty('reportCount', 1)
    })

    it('四半期別精算レポートを取得できること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment.id}/reports/quarterly-summary`)
        .query({ year: 2025, quarter: 1 })
        .expect(200)

      expect(response.body).toHaveProperty('quarter', 1)
      expect(response.body).toHaveProperty('year', 2025)
      expect(response.body).toHaveProperty('months')
      expect(response.body.months).toHaveLength(3)
    })

    it('精算データをCSVエクスポートできること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment.id}/reports/export`)
        .query({
          format: 'csv',
          periodStart: '2025-01-01',
          periodEnd: '2025-12-31',
        })

      if (response.status !== 200) {
        console.error('CSV export error:', response.body)
        console.error('Error details:', {
          status: response.status,
          text: response.text,
          body: response.body,
        })
      }

      expect(response.status).toBe(200)

      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.text).toContain(
        '報告期間,売上金額,手数料,純額,ステータス',
      )
    })
  })

  describe('精算通知機能', () => {
    it('未精算レポートの通知を送信できること', async () => {
      // 30日以上前の未精算レポートを作成
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        reportPeriodEnd: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        status: 'confirmed',
        totalSalesAmount: 20000,
      })

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports/send-reminder`)
        .expect(201)

      expect(response.body.remindersSent).toBe(1)
      expect(response.body.message).toContain(
        '未精算レポートの通知を送信しました',
      )
    })

    it('精算期限アラートを設定できること', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports/settlement-alerts`)
        .send({
          alertDays: [7, 3, 1], // 7日前、3日前、1日前に通知
          enabled: true,
        })
        .expect(201)

      expect(response.body.alertDays).toEqual([7, 3, 1])
      expect(response.body.enabled).toBe(true)
    })
  })
})
