import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Consignments Basic Integration Tests', () => {
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

  describe('Step 1: Basic functionality tests', () => {
    it('should display consignments list page', async () => {
      const response = await request(app.getHttpServer())
        .get('/consignments')
        .expect(200)

      expect(response.text).toContain('委託契約一覧')
      expect(response.text).toContain('新規委託契約')
    })

    it('should create a new consignment', async () => {
      // 委託可能な保管場所を作成
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const consignmentData = {
        locationId: location.id,
        storeName: 'テスト書店',
        commissionRate: 30,
        settlementCycle: 'monthly',
        contractStartDate: '2025-01-01',
        contactPerson: 'テスト担当者',
        contactEmail: 'test@example.com',
        contactPhone: '03-1234-5678',
        paymentInfo: 'テスト銀行 テスト支店 普通 1234567',
        contractTerms: 'テスト契約条件',
        notes: 'テストメモ',
      }

      const response = await request(app.getHttpServer())
        .post('/consignments')
        .send(consignmentData)
        .expect(302)

      expect(response.headers.location).toBe('/consignments')

      // 作成された委託契約を確認
      const listResponse = await request(app.getHttpServer())
        .get('/consignments')
        .expect(200)

      expect(listResponse.text).toContain('テスト書店')
      expect(listResponse.text).toContain('30%')
    })
  })
})
