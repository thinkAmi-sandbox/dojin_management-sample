import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Sales Reports - Basic Functionality', () => {
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

  it('should display sales reports page with empty data', async () => {
    const response = await request(app.getHttpServer()).get('/sales/reports')

    console.log('Response status:', response.status)
    if (response.status !== 200) {
      console.log('Error response body:', response.text)
    }

    expect(response.status).toBe(200)
    expect(response.text).toContain('売上レポート')
    expect(response.text).toContain('売上データがありません')
  })

  it('should generate basic sales report with test data', async () => {
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

    // 販売取引作成
    const testTransaction = await drizzleService.db
      .insert(schema.salesTransactions)
      .values({
        transactionType: 'event',
        locationId: testLocation[0].id,
        customerName: 'テスト顧客',
        totalAmount: 3000,
        discountAmount: 0,
        finalAmount: 3000,
        paymentMethod: 'cash',
      })
      .returning()

    // 販売明細作成
    await drizzleService.db.insert(schema.salesDetails).values({
      transactionId: testTransaction[0].id,
      editionId: testEdition[0].id,
      quantity: 3,
      unitPrice: 1000,
      discountAmount: 0,
      subtotal: 3000,
    })

    const response = await request(app.getHttpServer())
      .get('/sales/reports')
      .expect(200)

    expect(response.text).toContain('売上レポート')
    expect(response.text).toContain('テスト書籍')
    expect(response.text).toContain('3,000')
    expect(response.text).not.toContain('売上データがありません')
  })
})
