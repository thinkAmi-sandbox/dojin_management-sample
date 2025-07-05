import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe.skip('Sales Reports - Full Integration (Phase 4-3 - Not Implemented Yet)', () => {
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
    await app.close()
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
  })

  it('should display top selling editions ranking', async () => {
    // テストデータ作成
    const testBook1 = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'ベストセラー',
        status: 'completed',
      })
      .returning()

    const testBook2 = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '普通の本',
        status: 'completed',
      })
      .returning()

    const testEdition1 = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook1[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        isActive: true,
      })
      .returning()

    const testEdition2 = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook2[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 800,
        isActive: true,
      })
      .returning()

    const testLocation = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'warehouse',
        address: 'テスト住所',
      })
      .returning()

    // 販売取引作成（ベストセラーの方が多く売れている）
    const transaction1 = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'event',
        locationId: testLocation[0].id,
        totalAmount: 5000,
        finalAmount: 5000,
      })
      .returning()

    const transaction2 = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'online',
        locationId: testLocation[0].id,
        totalAmount: 1600,
        finalAmount: 1600,
      })
      .returning()

    // 明細作成
    await drizzleService.db.insert(schema.salesDetails).values([
      {
        transactionId: transaction1[0].id,
        editionId: testEdition1[0].id,
        quantity: 5,
        unitPrice: 1000,
        subtotal: 5000,
      },
      {
        transactionId: transaction2[0].id,
        editionId: testEdition2[0].id,
        quantity: 2,
        unitPrice: 800,
        subtotal: 1600,
      },
    ])

    const response = await request(app.getHttpServer())
      .get('/sales/reports/top-editions')
      .expect(200)

    expect(response.text).toContain('売上ランキング')
    expect(response.text).toContain('ベストセラー')
    expect(response.text).toContain('普通の本')
    // ベストセラーが1位で表示されることを確認
    expect(response.text).toContain('5,000')
    expect(response.text).toContain('1,600')
  })

  it('should generate edition-specific sales report', async () => {
    // テストデータ作成
    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '特定版書籍',
        status: 'completed',
      })
      .returning()

    const testEdition = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1200,
        isActive: true,
      })
      .returning()

    const testLocation = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'warehouse',
        address: 'テスト住所',
      })
      .returning()

    // 複数の販売取引作成
    for (let i = 0; i < 3; i++) {
      const transaction = await drizzleService.db
        .insert(schema.salesTransactions)
        .values({
          transactionType: i === 0 ? 'event' : i === 1 ? 'online' : 'direct',
          locationId: testLocation[0].id,
          totalAmount: 1200,
          finalAmount: 1200,
        })
        .returning()

      await drizzleService.db.insert(schema.salesDetails).values({
        transactionId: transaction[0].id,
        editionId: testEdition[0].id,
        quantity: 1,
        unitPrice: 1200,
        subtotal: 1200,
      })
    }

    const response = await request(app.getHttpServer())
      .get(`/sales/reports/editions/${testEdition[0].id}`)
      .expect(200)

    expect(response.text).toContain('版別売上レポート')
    expect(response.text).toContain('特定版書籍')
    expect(response.text).toContain('3,600') // 総売上
    expect(response.text).toContain('3') // 総取引数
  })

  it('should generate event-specific sales report', async () => {
    // テストデータ作成
    const testEvent = await drizzleService.db
      .insert(schema.events)
      .values({
        name: 'テストイベント',
        eventDate: '2024-06-01',
        applicationStartDate: '2024-05-01',
        applicationEndDate: '2024-05-31',
        venue: 'テスト会場',
        description: 'テストイベントです',
      })
      .returning()

    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'イベント限定書籍',
        status: 'completed',
      })
      .returning()

    const testEdition = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1500,
        isActive: true,
      })
      .returning()

    const testLocation = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'warehouse',
        address: 'テスト住所',
      })
      .returning()

    // イベント販売のみ作成
    const transaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'event',
        eventId: testEvent[0].id,
        locationId: testLocation[0].id,
        totalAmount: 4500,
        finalAmount: 4500,
      })
      .returning()

    await drizzleService.db.insert(schema.salesDetails).values({
      transactionId: transaction[0].id,
      editionId: testEdition[0].id,
      quantity: 3,
      unitPrice: 1500,
      subtotal: 4500,
    })

    const response = await request(app.getHttpServer())
      .get(`/sales/reports/events/${testEvent[0].id}`)
      .expect(200)

    expect(response.text).toContain('イベント別売上レポート')
    expect(response.text).toContain('イベント限定書籍')
    expect(response.text).toContain('4,500')
  })

  it('should provide API endpoints for chart data', async () => {
    // テストデータ作成
    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'API テスト書籍',
        status: 'completed',
      })
      .returning()

    const testEdition = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        isActive: true,
      })
      .returning()

    const testLocation = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'warehouse',
        address: 'テスト住所',
      })
      .returning()

    const transaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'online',
        locationId: testLocation[0].id,
        totalAmount: 2000,
        finalAmount: 2000,
      })
      .returning()

    await drizzleService.db.insert(schema.salesDetails).values({
      transactionId: transaction[0].id,
      editionId: testEdition[0].id,
      quantity: 2,
      unitPrice: 1000,
      subtotal: 2000,
    })

    // API エンドポイントテスト
    const summaryResponse = await request(app.getHttpServer())
      .get('/sales/api/reports/summary')
      .expect(200)

    expect(summaryResponse.body.success).toBe(true)
    expect(summaryResponse.body.data.totalTransactions).toBe(1)
    expect(summaryResponse.body.data.totalAmount).toBe(2000)

    const chartResponse = await request(app.getHttpServer())
      .get('/sales/api/reports/chart-data')
      .expect(200)

    expect(chartResponse.body.success).toBe(true)
    expect(chartResponse.body.data.labels).toBeDefined()
    expect(chartResponse.body.data.datasets).toBeDefined()
  })

  it('should handle complex filtering scenarios', async () => {
    // 複雑なテストデータセット作成
    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '複雑フィルタテスト',
        status: 'completed',
      })
      .returning()

    const testEdition = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook[0].id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 800,
        isActive: true,
      })
      .returning()

    const testLocation = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'warehouse',
        address: 'テスト住所',
      })
      .returning()

    // 異なる日付・タイプの販売を作成
    const transactions = []
    const dates = ['2024-01-15', '2024-06-15', '2024-12-15']
    const types = ['event', 'online', 'direct'] as const

    for (let i = 0; i < 3; i++) {
      const transaction = await drizzleService.db
        .insert(schema.salesTransactions)
        .values({
          transactionType: types[i],
          locationId: testLocation[0].id,
          totalAmount: (i + 1) * 800,
          finalAmount: (i + 1) * 800,
          transactionDate: new Date(dates[i]),
        })
        .returning()

      await drizzleService.db.insert(schema.salesDetails).values({
        transactionId: transaction[0].id,
        editionId: testEdition[0].id,
        quantity: i + 1,
        unitPrice: 800,
        subtotal: (i + 1) * 800,
      })

      transactions.push(transaction[0])
    }

    // 複雑なフィルタリングテスト
    const filteredResponse = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        transactionType: 'online',
      })
      .expect(200)

    expect(filteredResponse.text).toContain('売上レポート')
    // オンライン販売（6月）のみが表示されることを確認
    expect(filteredResponse.text).toContain('1,600')
    expect(filteredResponse.text).not.toContain('800') // 1月の event
    expect(filteredResponse.text).not.toContain('2,400') // 12月の direct
  })
})
