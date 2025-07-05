import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Sales Reports - Validation & Filtering', () => {
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

  it('should handle date range filtering correctly', async () => {
    // テストデータ作成（異なる日付）
    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
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

    // 2つの販売取引を異なる日付で作成
    const oldTransaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'event',
        locationId: testLocation[0].id,
        customerName: 'テスト顧客1',
        totalAmount: 1000,
        finalAmount: 1000,
        transactionDate: new Date('2024-01-01'),
      })
      .returning()

    const newTransaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'online',
        locationId: testLocation[0].id,
        customerName: 'テスト顧客2',
        totalAmount: 2000,
        finalAmount: 2000,
        transactionDate: new Date('2024-12-01'),
      })
      .returning()

    // 明細作成
    await drizzleService.db.insert(schema.salesDetails).values([
      {
        transactionId: oldTransaction[0].id,
        editionId: testEdition[0].id,
        quantity: 1,
        unitPrice: 1000,
        subtotal: 1000,
      },
      {
        transactionId: newTransaction[0].id,
        editionId: testEdition[0].id,
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
      },
    ])

    // 日付範囲フィルタ（新しい取引のみ）
    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        startDate: '2024-06-01',
        endDate: '2024-12-31',
      })
      .expect(200)

    expect(response.text).toContain('売上レポート')
    expect(response.text).toContain('2,000')
    expect(response.text).not.toContain('3,000')
  })

  it('should handle transaction type filtering correctly', async () => {
    // テストデータ作成
    const testBook = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
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

    // イベント販売
    const eventTransaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'event',
        locationId: testLocation[0].id,
        customerName: 'イベント顧客',
        totalAmount: 1000,
        finalAmount: 1000,
      })
      .returning()

    // オンライン販売
    const onlineTransaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'online',
        locationId: testLocation[0].id,
        customerName: 'オンライン顧客',
        totalAmount: 2000,
        finalAmount: 2000,
      })
      .returning()

    // 明細作成
    await drizzleService.db.insert(schema.salesDetails).values([
      {
        transactionId: eventTransaction[0].id,
        editionId: testEdition[0].id,
        quantity: 1,
        unitPrice: 1000,
        subtotal: 1000,
      },
      {
        transactionId: onlineTransaction[0].id,
        editionId: testEdition[0].id,
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
      },
    ])

    // イベント販売のみフィルタ
    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        transactionType: 'event',
      })
      .expect(200)

    expect(response.text).toContain('売上レポート')
    expect(response.text).toContain('イベント')
    expect(response.text).toContain('1,000')
    expect(response.text).not.toContain('2,000')
  })

  it('should handle invalid date parameters gracefully', async () => {
    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        startDate: 'invalid-date',
        endDate: '2024-12-31',
      })
      .expect(200)

    expect(response.text).toContain('売上レポート')
  })

  it('should handle invalid transaction type gracefully', async () => {
    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        transactionType: 'invalid-type',
      })
      .expect(200)

    expect(response.text).toContain('売上レポート')
  })

  it('should handle groupBy parameter correctly', async () => {
    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .query({
        groupBy: 'month',
      })
      .expect(200)

    expect(response.text).toContain('売上レポート')
    expect(response.text).toContain('月別')
  })
})
