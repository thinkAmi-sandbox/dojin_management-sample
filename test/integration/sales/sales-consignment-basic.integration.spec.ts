import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('販売管理 - コンシグメント管理基本機能', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let _testAuthor: schema.Author
  let testBook: schema.Book
  let testEdition: schema.Edition
  let testConsignmentLocation: schema.StorageLocation
  let testHomeLocation: schema.StorageLocation

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()
    drizzleService = moduleRef.get(DrizzleService)
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()

    // テスト用執筆者作成
    const [author] = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: 'テスト執筆者',
        email: 'test@example.com',
      })
      .returning()
    _testAuthor = author

    // テスト用書籍作成
    const [book] = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
        description: 'テスト用の書籍',
        status: 'completed',
      })
      .returning()
    testBook = book

    // テスト用版作成
    const [edition] = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        pageCount: 200,
      })
      .returning()
    testEdition = edition

    // 委託用保管場所作成
    const [consignmentLocation] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'メロンブックス秋葉原店',
        type: 'consignment',
        isConsignment: true,
        address: '東京都千代田区外神田1-10-5',
        contactInfo: '03-1234-5678',
        notes: '委託手数料: 30%',
      })
      .returning()
    testConsignmentLocation = consignmentLocation

    // 自宅保管場所作成
    const [homeLocation] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: '自宅倉庫',
        type: 'home',
        isConsignment: false,
        address: '東京都渋谷区',
      })
      .returning()
    testHomeLocation = homeLocation

    // 在庫データ作成（委託先に50冊）
    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testConsignmentLocation.id,
      quantity: 50,
      availableQuantity: 50,
      reservedQuantity: 0,
    })

    // 在庫データ作成（自宅に100冊）
    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testHomeLocation.id,
      quantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
    })
  })

  describe('委託販売取引の作成', () => {
    it('委託先での販売を正しく記録できる', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation.id,
          customerName: '購入者A',
          totalAmount: 1000,
          discountAmount: 0,
          finalAmount: 1000,
          paymentMethod: 'cash',
          notes: '委託先での販売',
          details: [
            {
              editionId: testEdition.id,
              quantity: 2,
              unitPrice: 500,
              discountAmount: 0,
            },
          ],
        })

      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/sales')

      // 販売取引が作成されたことを確認
      const transactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .where(eq(schema.salesTransactions.transactionType, 'consignment'))

      expect(transactions).toHaveLength(1)
      expect(transactions[0].locationId).toBe(testConsignmentLocation.id)
      expect(transactions[0].finalAmount).toBe(1000)

      // 在庫が減少したことを確認
      const [stock] = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.locationId, testConsignmentLocation.id))

      expect(stock.quantity).toBe(48)
      expect(stock.availableQuantity).toBe(48)
    })

    it('委託手数料を考慮した売上計算ができる', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation.id,
          customerName: '購入者B',
          totalAmount: 3000,
          discountAmount: 900, // 30%委託手数料
          finalAmount: 2100, // 実際の受取額
          paymentMethod: 'cash',
          notes: '委託手数料30%控除',
          details: [
            {
              editionId: testEdition.id,
              quantity: 3,
              unitPrice: 1000,
              discountAmount: 0,
            },
          ],
        })

      expect(response.status).toBe(302)

      const [transaction] = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .orderBy(schema.salesTransactions.id)

      expect(transaction.totalAmount).toBe(3000)
      expect(transaction.discountAmount).toBe(900)
      expect(transaction.finalAmount).toBe(2100)
    })

    it('在庫移動履歴に委託販売が記録される', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation.id,
          customerName: '購入者C',
          totalAmount: 1000,
          discountAmount: 0,
          finalAmount: 1000,
          paymentMethod: 'cash',
          details: [
            {
              editionId: testEdition.id,
              quantity: 1,
              unitPrice: 1000,
              discountAmount: 0,
            },
          ],
        })

      // 在庫移動履歴を確認
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.movementType, 'sale'))

      expect(movements).toHaveLength(1)
      expect(movements[0].fromLocationId).toBe(testConsignmentLocation.id)
      expect(movements[0].quantity).toBe(1)
      expect(movements[0].referenceType).toBe('sale')
    })
  })
})
