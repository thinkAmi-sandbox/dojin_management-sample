import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Consignments Integration Tests', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
    await app.init()
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
  })

  describe('Step 3: Full integration tests', () => {
    it('should display consignment details with stock status', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      // 現在はconsignmentsテーブルが存在しないのでコメントアウト
      // const [consignment] = await drizzleService.db
      //   .insert(schema.consignments)
      //   .values({
      //     locationId: location.id,
      //     storeName: 'テスト書店',
      //     commissionRate: 30,
      //     contractStartDate: new Date('2025-01-01'),
      //   })
      //   .returning()

      // テスト用データを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          status: 'completed',
        })
        .returning()

      const [edition] = await drizzleService.db
        .insert(schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
        })
        .returning()

      const [consignment] = await drizzleService.db
        .insert(schema.consignments)
        .values({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 30,
          settlementCycle: 'monthly',
          contractStartDate: new Date('2025-01-01'),
          contractEndDate: null,
          contactPerson: '山田太郎',
          contactEmail: 'yamada@example.com',
          contactPhone: '03-1234-5678',
          paymentInfo: '振込先：○○銀行',
          contractTerms: '月末締め、翌月末払い',
          notes: null,
          isActive: true,
        })
        .returning()

      await drizzleService.db.insert(schema.stocks).values({
        editionId: edition.id,
        locationId: location.id,
        quantity: 50,
        availableQuantity: 50,
      })

      const response = await request(app.getHttpServer())
        .get(`/consignments/${consignment.id}`)
        .expect(200)

      expect(response.text).toContain('テスト書店')
      expect(response.text).toContain('30%')
      expect(response.text).toContain('委託在庫状況')
      expect(response.text).toContain('種類数')
      expect(response.text).toContain('1')
      expect(response.text).toContain('総在庫数')
      expect(response.text).toContain('50')
    })

    it('should update consignment information', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const [consignment] = await drizzleService.db
        .insert(schema.consignments)
        .values({
          locationId: location.id,
          storeName: '旧店舗名',
          commissionRate: 30,
          settlementCycle: 'monthly',
          contractStartDate: new Date('2025-01-01'),
          contractEndDate: null,
          contactPerson: null,
          contactEmail: null,
          contactPhone: null,
          paymentInfo: null,
          contractTerms: null,
          notes: null,
          isActive: true,
        })
        .returning()

      const updateData = {
        _method: 'PUT',
        locationId: location.id,
        storeName: '新店舗名',
        commissionRate: 35,
        settlementCycle: 'quarterly',
        contractStartDate: '2025-01-01',
        contactPerson: '新担当者',
      }

      await request(app.getHttpServer())
        .post(`/consignments/${consignment.id}`)
        .send(updateData)
        .expect(302)

      const response = await request(app.getHttpServer())
        .get(`/consignments/${consignment.id}`)
        .expect(200)

      expect(response.text).toContain('新店舗名')
      expect(response.text).toContain('35%')
      expect(response.text).toContain('新担当者')
    })

    it('should display edit form with current data', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const [consignment] = await drizzleService.db
        .insert(schema.consignments)
        .values({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 30,
          settlementCycle: 'monthly',
          contractStartDate: new Date('2025-01-01'),
          contractEndDate: null,
          contactPerson: null,
          contactEmail: 'test@example.com',
          contactPhone: null,
          paymentInfo: null,
          contractTerms: null,
          notes: null,
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/consignments/${consignment.id}/edit`)
        .expect(200)

      expect(response.text).toContain('委託契約編集')
      expect(response.text).toContain('テスト書店')
      expect(response.text).toContain('value="30"')
      expect(response.text).toContain('test@example.com')
    })

    it('should delete consignment without stocks', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const [consignment] = await drizzleService.db
        .insert(schema.consignments)
        .values({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 30,
          settlementCycle: 'monthly',
          contractStartDate: new Date('2025-01-01'),
          contractEndDate: null,
          contactPerson: null,
          contactEmail: null,
          contactPhone: null,
          paymentInfo: null,
          contractTerms: null,
          notes: null,
          isActive: true,
        })
        .returning()

      await request(app.getHttpServer())
        .delete(`/consignments/${consignment.id}`)
        .expect(302)

      // 削除されたことを確認
      await request(app.getHttpServer())
        .get(`/consignments/${consignment.id}`)
        .expect(404)
    })

    it('should prevent deletion of consignment with stocks', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const [consignment] = await drizzleService.db
        .insert(schema.consignments)
        .values({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 30,
          settlementCycle: 'monthly',
          contractStartDate: new Date('2025-01-01'),
          contractEndDate: null,
          contactPerson: null,
          contactEmail: null,
          contactPhone: null,
          paymentInfo: null,
          contractTerms: null,
          notes: null,
          isActive: true,
        })
        .returning()

      // テスト用データを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          status: 'completed',
        })
        .returning()

      const [edition] = await drizzleService.db
        .insert(schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
        })
        .returning()

      await drizzleService.db.insert(schema.stocks).values({
        editionId: edition.id,
        locationId: location.id,
        quantity: 10,
        availableQuantity: 10,
      })

      const response = await request(app.getHttpServer())
        .delete(`/consignments/${consignment.id}`)
        .expect(400)

      expect(response.text).toContain('委託先に在庫があるため削除できません')
    })
  })
})
