import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('ConsignmentSales Basic Integration Tests', () => {
  let app: INestApplication

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
  })

  describe('POST /consignments/:consignmentId/reports (販売報告作成)', () => {
    it('委託販売報告を作成できること', async () => {
      // テストデータ作成
      const book = await testDbUtils.createTestBook()
      const edition = await testDbUtils.createTestEdition(book.id, {
        versionNumber: 1,
      })
      const location = await testDbUtils.createTestStorageLocation({
        type: 'consignment',
        isConsignment: true,
      })
      const consignment = await testDbUtils.createTestConsignment({
        locationId: location.id,
        storeName: 'テスト書店',
        commissionRate: 30,
      })

      // 委託先在庫を作成
      await testDbUtils.createTestStock({
        editionId: edition.id,
        locationId: location.id,
        quantity: 50,
        availableQuantity: 50,
      })

      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: 5000,
        details: [
          {
            editionId: edition.id,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
        notes: '1月度販売報告',
      }

      const response = await request(app.getHttpServer())
        .post(`/consignments/${consignment.id}/reports`)
        .send(reportData)
        .expect(302)

      expect(response.headers.location).toBe(
        `/consignments/${consignment.id}/reports`,
      )

      // データベース確認
      const [salesReport] = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSales)
        .where(
          sql`${schema.consignmentSales.consignmentId} = ${consignment.id}`,
        )

      expect(salesReport).toBeDefined()
      expect(salesReport.totalSalesAmount).toBe(5000)
      expect(salesReport.commissionAmount).toBe(1500) // 30% = 1500円
      expect(salesReport.netAmount).toBe(3500) // 5000 - 1500
      expect(salesReport.status).toBe('reported')

      // 在庫が減少していることを確認
      const [updatedStock] = await testDbUtils.drizzleDb
        .select()
        .from(schema.stocks)
        .where(
          sql`${schema.stocks.editionId} = ${edition.id} AND ${schema.stocks.locationId} = ${location.id}`,
        )

      expect(updatedStock.quantity).toBe(45) // 50 - 5
      expect(updatedStock.availableQuantity).toBe(45)
    })

    it('複数の版の販売報告を作成できること', async () => {
      const book = await testDbUtils.createTestBook()
      const edition1 = await testDbUtils.createTestEdition(book.id, {
        versionNumber: 1,
      })
      const edition2 = await testDbUtils.createTestEdition(book.id, {
        versionNumber: 2,
      })
      const location = await testDbUtils.createTestStorageLocation({
        type: 'consignment',
        isConsignment: true,
      })
      const consignment = await testDbUtils.createTestConsignment({
        locationId: location.id,
        storeName: 'テスト書店',
        commissionRate: 25,
      })

      // 各版の委託先在庫を作成
      await testDbUtils.createTestStock({
        editionId: edition1.id,
        locationId: location.id,
        quantity: 30,
        availableQuantity: 30,
      })
      await testDbUtils.createTestStock({
        editionId: edition2.id,
        locationId: location.id,
        quantity: 40,
        availableQuantity: 40,
      })

      const reportData = {
        reportPeriodStart: '2025-02-01',
        reportPeriodEnd: '2025-02-28',
        totalSalesAmount: 8500,
        details: [
          {
            editionId: edition1.id,
            quantity: 3,
            unitPrice: 1000,
          },
          {
            editionId: edition2.id,
            quantity: 5,
            unitPrice: 1100,
          },
        ],
        notes: '2月度販売報告',
      }

      await request(app.getHttpServer())
        .post(`/consignments/${consignment.id}/reports`)
        .send(reportData)
        .expect(302)

      // 明細確認
      const details = await testDbUtils.drizzleDb
        .select()
        .from(schema.consignmentSalesDetails)
        .orderBy(schema.consignmentSalesDetails.editionId)

      expect(details).toHaveLength(2)
      expect(details[0].quantity).toBe(3)
      expect(details[0].unitPrice).toBe(1000)
      expect(details[0].subtotal).toBe(3000)
      expect(details[1].quantity).toBe(5)
      expect(details[1].unitPrice).toBe(1100)
      expect(details[1].subtotal).toBe(5500)
    })
  })

  describe('GET /consignments/:consignmentId/reports (販売報告一覧)', () => {
    it('委託契約の販売報告一覧を表示できること', async () => {
      const location = await testDbUtils.createTestStorageLocation({
        type: 'consignment',
        isConsignment: true,
      })
      const consignment = await testDbUtils.createTestConsignment({
        locationId: location.id,
        storeName: 'テスト書店',
        commissionRate: 30,
      })

      // 複数の販売報告を作成
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: consignment.id,
        totalSalesAmount: 5000,
        reportPeriodStart: new Date('2025-01-01'),
        reportPeriodEnd: new Date('2025-01-31'),
      })
      await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: consignment.id,
        totalSalesAmount: 6000,
        reportPeriodStart: new Date('2025-02-01'),
        reportPeriodEnd: new Date('2025-02-28'),
      })

      const response = await request(app.getHttpServer())
        .get(`/consignments/${consignment.id}/reports`)
        .expect(200)

      expect(response.text).toContain('テスト書店 - 販売報告一覧')
      expect(response.text).toContain('¥5,000')
      expect(response.text).toContain('¥6,000')
      expect(response.text).toContain('報告済み')
    })
  })
})
