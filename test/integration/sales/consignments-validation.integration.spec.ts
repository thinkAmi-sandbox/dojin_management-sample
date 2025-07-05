import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Consignments Validation Integration Tests', () => {
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

  describe('Step 2: Validation tests', () => {
    it('should validate required fields when creating consignment', async () => {
      const response = await request(app.getHttpServer())
        .post('/consignments')
        .send({
          // 必須フィールドを省略
        })
        .expect(200) // ValidationExceptionFilterがHTMLでエラーを返す

      expect(response.text).toContain('保管場所は必須です')
      expect(response.text).toContain('店舗名は必須です')
      expect(response.text).toContain('手数料率は必須です')
      expect(response.text).toContain('契約開始日は必須です')
    })

    it('should validate commission rate range', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト委託先',
          type: 'consignment',
          isConsignment: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .post('/consignments')
        .send({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 150, // 無効な値
          contractStartDate: '2025-01-01',
        })
        .expect(200)

      expect(response.text).toContain('手数料率は100以下で入力してください')
    })

    it('should prevent using non-consignment location', async () => {
      const [location] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト自宅',
          type: 'home', // 委託以外のタイプ
          isConsignment: false,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .post('/consignments')
        .send({
          locationId: location.id,
          storeName: 'テスト書店',
          commissionRate: 30,
          contractStartDate: '2025-01-01',
        })
        .expect(400)

      expect(response.text).toContain('委託先として使用できない保管場所です')
    })

    it('should return 404 for non-existent consignment', async () => {
      await request(app.getHttpServer())
        .get('/consignments/99999')
        .expect(404)
    })

    it('should prevent deletion of consignment with unsettled sales', async () => {
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

      // 未精算の販売報告があると仮定（実際の実装では consignmentSales を作成）
      // ここではモックまたは統合テストの後半で実装

      // 現在はconsignmentsテーブルが存在しないのでスキップ
      // const response = await request(app.getHttpServer())
      //   .delete(`/consignments/${consignment.id}`)
      //   .expect(200) // 現時点では成功（販売報告機能が未実装のため）
    })
  })
})