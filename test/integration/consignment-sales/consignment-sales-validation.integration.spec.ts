import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('ConsignmentSales Validation Integration Tests', () => {
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

  describe('POST /consignments/:consignmentId/reports バリデーション', () => {
    it('必須項目が欠けている場合はエラーになること', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send({})
        .expect(400) // 必須項目がない場合は400エラー

      expect(response.body.statusCode).toBe(400)
      expect(response.body.message).toBe('Bad Request Exception')
    })

    it('日付形式が不正な場合はエラーになること', async () => {
      const reportData = {
        reportPeriodStart: 'invalid-date',
        reportPeriodEnd: 'invalid-date',
        totalSalesAmount: 5000,
        details: [
          {
            editionId: testEdition.id,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(400)

      expect(response.body.statusCode).toBe(400)
      expect(response.body.message).toBe('Bad Request Exception')
    })

    it('総売上金額が負の値の場合はエラーになること', async () => {
      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: -1000,
        details: [
          {
            editionId: testEdition.id,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(400)

      expect(response.body.statusCode).toBe(400)
      expect(response.body.message).toBe('Bad Request Exception')
    })

    it('在庫不足の場合はエラーになること', async () => {
      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: 100000,
        details: [
          {
            editionId: testEdition.id,
            quantity: 100, // 在庫は50しかない
            unitPrice: 1000,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(400)

      expect(response.body.message).toContain('委託先在庫が不足しています')
    })

    it('存在しない版IDを指定した場合はエラーになること', async () => {
      const reportData = {
        reportPeriodStart: '2025-01-01',
        reportPeriodEnd: '2025-01-31',
        totalSalesAmount: 5000,
        details: [
          {
            editionId: 99999,
            quantity: 5,
            unitPrice: 1000,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports`)
        .send(reportData)
        .expect(500) // 外部キー制約エラーで500エラーになる

      expect(response.body.statusCode).toBe(500)
      expect(response.body.message).toContain('Internal server error')
    })
  })

  describe('POST /consignments/:consignmentId/reports/:id/confirm バリデーション', () => {
    it('存在しない販売報告IDを指定した場合は404エラーになること', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consignments/${testConsignment.id}/reports/99999/confirm`)
        .send({ notes: 'テスト' })
        .expect(404)

      expect(response.body.message).toContain('委託販売報告が見つかりません')
    })

    it('既に確認済みの報告を再度確認しようとした場合はエラーになること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 5000,
        status: 'confirmed',
      })

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/confirm`,
        )
        .send({ notes: 'テスト' })
        .expect(400)

      expect(response.body.message).toContain(
        '報告済み状態の販売報告のみ確認できます',
      )
    })
  })

  describe('POST /consignments/:consignmentId/reports/:id/settle バリデーション', () => {
    it('精算方法が未指定の場合はエラーになること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 5000,
        status: 'confirmed',
      })

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/settle`,
        )
        .send({})
        .expect(400)

      expect(response.body.statusCode).toBe(400)
      expect(response.body.message).toBe('Bad Request Exception')
    })

    it('報告済み状態の報告を直接精算しようとした場合はエラーになること', async () => {
      const salesReport = await testDbUtils.createTestConsignmentSalesReport({
        consignmentId: testConsignment.id,
        totalSalesAmount: 5000,
        status: 'reported',
      })

      const response = await request(app.getHttpServer())
        .post(
          `/consignments/${testConsignment.id}/reports/${salesReport.id}/settle`,
        )
        .send({ settlementMethod: 'bank_transfer' })
        .expect(400)

      expect(response.body.message).toContain(
        '確認済みまたは調整済み状態の販売報告のみ精算できます',
      )
    })
  })
})
