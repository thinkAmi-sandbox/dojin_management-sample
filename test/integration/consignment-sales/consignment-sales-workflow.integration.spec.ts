import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('ConsignmentSales Workflow Integration Tests', () => {
  let app: INestApplication
  let testConsignment: schema.Consignment
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

    // 共通テストデータ作成
    const book = await testDbUtils.createTestBook()
    testEdition = await testDbUtils.createTestEdition(book.id)
    const location = await testDbUtils.createTestStorageLocation({
      type: 'consignment',
      isConsignment: true,
    })
    testConsignment = await testDbUtils.createTestConsignment({
      locationId: location.id,
      storeName: 'テスト書店',
      commissionRate: 30,
    })

    // 委託先在庫を作成
    await testDbUtils.createTestStock({
      editionId: testEdition.id,
      locationId: location.id,
      quantity: 50,
      availableQuantity: 50,
    })
  })

  describe('委託販売報告ワークフロー', () => {
    it('報告→確認→精算の完全なワークフローを実行できること', async () => {
      // 1. 販売報告作成
      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: 5000,
        details: [
          {
            editionId: testEdition.id,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
        notes: '1月度販売報告',
      }

      await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(302)

      // データベースから作成された報告を取得
      const [salesReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(
          sql`${schema.consignmentSales.consignmentId} = ${testConsignment.id}`,
        )

      expect(salesReport.status).toBe('reported')

      // 2. 内容確認
      await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/confirm`,
        )
        .send({ notes: '内容確認済み' })
        .expect(302)

      const [confirmedReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(sql`${schema.consignmentSales.id} = ${salesReport.id}`)

      expect(confirmedReport.status).toBe('confirmed')
      expect(confirmedReport.confirmedAt).toBeDefined()

      // 3. 精算処理
      await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/settle`,
        )
        .send({
          settlementMethod: 'bank_transfer',
          notes: '銀行振込にて精算完了',
        })
        .expect(302)

      const [settledReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(sql`${schema.consignmentSales.id} = ${salesReport.id}`)

      expect(settledReport.status).toBe('settled')
      expect(settledReport.settledAt).toBeDefined()
      expect(settledReport.settlementMethod).toBe('bank_transfer')
    })

    it('報告→確認→調整→精算の調整ありワークフローを実行できること', async () => {
      // 1. 販売報告作成
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 5000,
        status: 'reported',
      })

      // 2. 内容確認
      await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/confirm`,
        )
        .send({ notes: '内容確認済み' })
        .expect(302)

      // 3. 調整処理（金額変更）
      await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/adjust`,
        )
        .send({
          adjustmentReason: '返品分を差し引き',
          adjustedSalesAmount: 4500,
        })
        .expect(302)

      const [adjustedReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(sql`${schema.consignmentSales.id} = ${salesReport.id}`)

      expect(adjustedReport.status).toBe('adjusted')
      expect(adjustedReport.adjustedAt).toBeDefined()
      expect(adjustedReport.totalSalesAmount).toBe(4500)
      expect(adjustedReport.commissionAmount).toBe(1350) // 30% = 1350円
      expect(adjustedReport.netAmount).toBe(3150) // 4500 - 1350
      expect(adjustedReport.adjustmentReason).toContain('返品分を差し引き')

      // 4. 精算処理
      await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/settle`,
        )
        .send({
          settlementMethod: 'cash',
          notes: '現金にて精算',
        })
        .expect(302)

      const [settledReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(sql`${schema.consignmentSales.id} = ${salesReport.id}`)

      expect(settledReport.status).toBe('settled')
      expect(settledReport.settlementMethod).toBe('cash')
    })

    it('在庫移動履歴が正しく記録されること', async () => {
      // 販売報告作成
      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: 5000,
        details: [
          {
            editionId: testEdition.id,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
        notes: '1月度販売報告',
      }

      await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(302)

      // 在庫移動履歴確認
      const [movement] = await testDbUtils.drizzleDb
        .select()
        .from(schema.stockMovements)
        .where(sql`${schema.stockMovements.editionId} = ${testEdition.id}`)

      expect(movement).toBeDefined()
      expect(movement.fromLocationId).toBe(testConsignment.locationId)
      expect(movement.toLocationId).toBeNull()
      expect(movement.quantity).toBe(5)
      expect(movement.movementType).toBe('sale')
      expect(movement.referenceType).toBe('consignment_sale')
      expect(movement.reason).toContain('委託販売による減少')
    })
  })

  describe('GET /consignments/:consignmentId/reports/:id (販売報告詳細)', () => {
    it('販売報告の詳細を表示できること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 5000,
        reportPeriodStart: new Date('2025-01-01'),
        reportPeriodEnd: new Date('2025-01-31'),
      })

      // 明細も作成
      await testDbUtils.drizzleDb
        .insert(schema.consignmentSalesDetails)
        .values({
          consignmentSalesId: salesReport.id,
          editionId: testEdition.id,
          quantity: 5,
          unitPrice: 1000,
          subtotal: 5000,
        })

      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment.id}/reports/${salesReport.id}`)
        .expect(200)

      expect(response.text).toContain('販売報告詳細 - テスト書店')
      expect(response.text).toContain('¥5,000')
      expect(response.text).toContain('¥1,500') // 手数料
      expect(response.text).toContain('¥3,500') // 純額
    })
  })

  describe('GET /consignments/:consignmentId/reports/new (新規販売報告フォーム)', () => {
    it('新規販売報告フォームを表示できること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/consignments/${testConsignment.id}/reports/new`)
        .expect(200)

      expect(response.text).toContain('テスト書店 - 新規販売報告')
      expect(response.text).toContain('報告期間開始日')
      expect(response.text).toContain('報告期間終了日')
      expect(response.text).toContain('総売上金額')
    })
  })
})
