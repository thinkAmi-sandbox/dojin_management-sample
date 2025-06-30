import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('販売管理基本機能（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testEdition: schema.Edition
  let testEvent: schema.Event
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

    // 1. 書籍作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '販売テスト書籍',
        status: 'completed',
      })
      .returning()
    const testBook = bookResult[0]

    // 2. 版作成
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

    // 3. イベント作成
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
    testEvent = eventResult[0]

    // 4. 保管場所作成
    const locationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト販売場所',
        type: 'event',
        isConsignment: false,
      })
      .returning()
    testLocation = locationResult[0]

    // 5. 在庫作成（将来の在庫連携機能用）
    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testLocation.id,
      quantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    })
  })

  // Step 1: 基本機能テスト（2テスト）
  describe('GET /sales', () => {
    it('販売記録一覧画面を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales')
        .expect(200)

      const html = response.text
      expect(html).toContain('<title>販売記録一覧</title>')
      expect(html).toContain('<h1>販売記録一覧</h1>')
    })
  })

  describe('POST /sales', () => {
    it('新規販売記録を正常に作成する', async () => {
      const salesData = {
        transactionType: 'event',
        eventId: testEvent.id,
        locationId: testLocation.id,
        customerName: 'テスト顧客',
        totalAmount: 1000,
        finalAmount: 1000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: testEdition.id,
            quantity: 1,
            unitPrice: 1000,
            subtotal: 1000,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(salesData)
        .expect(302)

      expect(response.header.location).toBe('/sales')

      // データベースに正しく保存されていることを確認
      const salesTransactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
      expect(salesTransactions).toHaveLength(1)
      expect(salesTransactions[0].transactionType).toBe('event')
      expect(salesTransactions[0].customerName).toBe('テスト顧客')
    })
  })
})
