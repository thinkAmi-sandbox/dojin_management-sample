import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('販売管理バリデーション（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testEdition: schema.Edition
  let _testEvent: schema.Event
  let testLocation: schema.StorageLocation

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

    // テストデータ作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '販売テスト書籍',
        status: 'completed',
      })
      .returning()
    const testBook = bookResult[0]

    const editionResult = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        pageCount: 200,
        basePrice: 1000,
        publishDate: '2024-06-01',
      })
      .returning()
    testEdition = editionResult[0]

    const eventResult = await drizzleService.db
      .insert(schema.events)
      .values({
        name: '技術書典17',
        eventDate: '2024-12-07',
        venue: '東京ビッグサイト',
        applicationStartDate: '2024-09-01',
        applicationEndDate: '2024-09-30',
      })
      .returning()
    _testEvent = eventResult[0]

    const locationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト販売場所',
        type: 'event',
        isConsignment: false,
      })
      .returning()
    testLocation = locationResult[0]

    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testLocation.id,
      quantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    })
  })

  // Step 2: バリデーションテスト（3テスト）
  describe('POST /sales - バリデーションエラー', () => {
    it('必須項目が未送信の場合はバリデーションエラーを表示する', async () => {
      const invalidSalesData = {}

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(invalidSalesData)

      // ValidationExceptionFilterにより200でエラーページが返される
      expect(response.status).toBe(200)

      const html = response.text
      expect(html).toContain('販売タイプを選択してください')
      expect(html).toContain('合計金額は必須です')
      expect(html).toContain('最終金額は必須です')
      expect(html).toContain('販売明細は配列で入力してください')
    })

    it('無効な販売タイプの場合はバリデーションエラーを表示する', async () => {
      const invalidSalesData = {
        transactionType: 'invalid_type',
        totalAmount: 1000,
        finalAmount: 1000,
        details: [],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(invalidSalesData)

      expect(response.status).toBe(200)

      const html = response.text
      expect(html).toContain('販売タイプを選択してください')
    })

    it('無効な金額の場合はバリデーションエラーを表示する', async () => {
      const invalidSalesData = {
        transactionType: 'event',
        totalAmount: -100, // 負の値
        finalAmount: 0, // ゼロ
        details: [
          {
            editionId: testEdition.id,
            quantity: -1, // 負の値
            unitPrice: 0, // ゼロ
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(invalidSalesData)

      expect(response.status).toBe(200)

      const html = response.text
      expect(html).toContain('合計金額は正の数で入力してください')
      expect(html).toContain('最終金額は必須です') // 0が変換されるため必須エラーになる
      expect(html).toContain('details.0.数量は正の数で入力してください')
      expect(html).toContain('details.0.単価は必須です') // 0が変換されるため必須エラーになる
    })
  })
})
