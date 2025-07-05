import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Sales Stock Integration', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let createdBookId: number
  let createdEditionId: number
  let createdEdition2Id: number
  let createdLocationId: number
  let createdEventId: number
  let createdStockId: number
  let createdStock2Id: number

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()
    drizzleService = moduleRef.get(DrizzleService)
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()

    // テスト用データの作成
    // 書籍
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: '在庫連携テスト書籍',
        status: 'completed',
      })
      .returning()
    createdBookId = bookResult[0].id

    // 版（2つ作成）
    const editionResult1 = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: createdBookId,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        pageCount: 200,
        publishDate: '2024-06-01',
      })
      .returning()
    createdEditionId = editionResult1[0].id

    const editionResult2 = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: createdBookId,
        versionName: '第2版',
        versionNumber: 2,
        basePrice: 1200,
        pageCount: 220,
        publishDate: '2024-08-01',
      })
      .returning()
    createdEdition2Id = editionResult2[0].id

    // 保管場所
    const locationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト倉庫',
        type: 'warehouse',
        isConsignment: false,
      })
      .returning()
    createdLocationId = locationResult[0].id

    // イベント
    const eventResult = await drizzleService.db
      .insert(schema.events)
      .values({
        name: 'テストイベント',
        eventDate: '2025-08-01',
        venue: '東京ビッグサイト',
        applicationStartDate: '2025-06-01',
        applicationEndDate: '2025-06-30',
      })
      .returning()
    createdEventId = eventResult[0].id

    // 在庫データ
    const stockResult1 = await drizzleService.db
      .insert(schema.stocks)
      .values({
        editionId: createdEditionId,
        locationId: createdLocationId,
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
      })
      .returning()
    createdStockId = stockResult1[0].id

    const stockResult2 = await drizzleService.db
      .insert(schema.stocks)
      .values({
        editionId: createdEdition2Id,
        locationId: createdLocationId,
        quantity: 50,
        availableQuantity: 50,
        reservedQuantity: 0,
      })
      .returning()
    createdStock2Id = stockResult2[0].id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('基本機能テスト', () => {
    it('正常な販売時に在庫が減少すること', async () => {
      // 販売取引を作成
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 3000,
        discountAmount: 0,
        finalAmount: 3000,
        paymentMethod: 'cash',
        notes: '在庫減少テスト',
        details: [
          {
            editionId: createdEditionId,
            quantity: 3,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 在庫を確認
      const stockData = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      const stock = stockData[0]

      expect(stock).toBeDefined()
      expect(stock.quantity).toBe(97) // 100 - 3 = 97
      expect(stock.availableQuantity).toBe(97) // 100 - 3 = 97
      expect(stock.reservedQuantity).toBe(0)
    })

    it('在庫移動履歴が記録されること', async () => {
      // 販売取引を作成
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 2000,
        discountAmount: 0,
        finalAmount: 2000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 2,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 在庫移動履歴を確認
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.editionId, createdEditionId))

      expect(movements).toHaveLength(1)
      expect(movements[0]).toMatchObject({
        editionId: createdEditionId,
        fromLocationId: createdLocationId,
        toLocationId: null,
        quantity: 2,
        movementType: 'sale',
        referenceType: 'sale',
        reason: expect.stringContaining('販売による減少'),
      })
    })

    it('複数版同時販売で各版の在庫が正しく減少すること', async () => {
      // 複数版の販売取引を作成
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 4600,
        discountAmount: 0,
        finalAmount: 4600,
        paymentMethod: 'credit',
        details: [
          {
            editionId: createdEditionId,
            quantity: 2,
            unitPrice: 1000,
            discountAmount: 0,
          },
          {
            editionId: createdEdition2Id,
            quantity: 3,
            unitPrice: 1200,
            discountAmount: 0,
          },
        ],
      }

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 各版の在庫を確認
      const stock1Data = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      const stock1 = stock1Data[0]

      const stock2Data = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStock2Id))
        .limit(1)
      const stock2 = stock2Data[0]

      expect(stock1.quantity).toBe(98) // 100 - 2 = 98
      expect(stock1.availableQuantity).toBe(98)
      expect(stock2.quantity).toBe(47) // 50 - 3 = 47
      expect(stock2.availableQuantity).toBe(47)

      // 各版の移動履歴を確認
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
      expect(movements).toHaveLength(2)
    })
  })

  describe('エラーハンドリングテスト', () => {
    it('在庫不足時にエラーが発生すること', async () => {
      // 在庫不足の販売取引を作成
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 15000,
        discountAmount: 0,
        finalAmount: 15000,
        paymentMethod: 'cash',
        notes: '在庫不足テスト',
        details: [
          {
            editionId: createdEditionId,
            quantity: 150, // 在庫100に対して150冊販売
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(400)

      // 在庫が変わっていないことを確認
      const stockData = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      const stock = stockData[0]

      expect(stock.quantity).toBe(100) // 在庫は変わらない
      expect(stock.availableQuantity).toBe(100)
    })

    it('トランザクションロールバックが正しく動作すること', async () => {
      // 複数明細で一部在庫不足の販売取引
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 10, // これは成功するはず
            unitPrice: 1000,
            discountAmount: 0,
          },
          {
            editionId: createdEdition2Id,
            quantity: 60, // 在庫50に対して60冊（失敗）
            unitPrice: 1200,
            discountAmount: 0,
          },
        ],
      }

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(400)

      // 両方の在庫が変わっていないことを確認
      const stock1Data = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      const stock1 = stock1Data[0]

      const stock2Data = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStock2Id))
        .limit(1)
      const stock2 = stock2Data[0]

      expect(stock1.quantity).toBe(100) // ロールバックされている
      expect(stock2.quantity).toBe(50) // ロールバックされている

      // 販売取引も作成されていないことを確認
      const transactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
      expect(transactions).toHaveLength(0)
    })

    it('在庫なし（0）での販売がエラーになること', async () => {
      // 在庫を0にする
      await drizzleService.db
        .update(schema.stocks)
        .set({
          quantity: 0,
          availableQuantity: 0,
        })
        .where(eq(schema.stocks.id, createdStockId))

      // 販売試行
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 1000,
        discountAmount: 0,
        finalAmount: 1000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 1,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(400)

      // エラーメッセージの確認
      expect(response.text).toContain('在庫が不足しています')
    })
  })

  describe('境界条件・削除テスト', () => {
    it('販売取引削除時に在庫が復元されること', async () => {
      // まず販売取引を作成
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 5000,
        discountAmount: 0,
        finalAmount: 5000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 5,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      // 販売取引を作成
      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 在庫が減少していることを確認
      const stockAfterSale = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      expect(stockAfterSale[0].quantity).toBe(95)

      // 作成された販売取引を取得
      const transactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
      const transactionId = transactions[0].id

      // 販売取引を削除（HTTPメソッドオーバーライド）
      await request(app.getHttpServer())
        .post(`/sales/${transactionId}`)
        .send({ _method: 'DELETE' })
        .expect(302)

      // 在庫が復元されていることを確認
      const stockAfterDelete = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      expect(stockAfterDelete[0].quantity).toBe(100) // 元に戻る
      expect(stockAfterDelete[0].availableQuantity).toBe(100)

      // 返品履歴が記録されていることを確認
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.editionId, createdEditionId))

      // 販売と返品の2つの履歴があるはず
      expect(movements).toHaveLength(2)
      expect(movements[1]).toMatchObject({
        movementType: 'return',
        referenceType: 'sale',
        quantity: 5,
        toLocationId: createdLocationId,
        fromLocationId: null,
      })
    })

    it('予約在庫との整合性が保たれること', async () => {
      // 予約在庫を設定
      await drizzleService.db
        .update(schema.stocks)
        .set({
          quantity: 100,
          reservedQuantity: 20,
          availableQuantity: 80, // 100 - 20 = 80
        })
        .where(eq(schema.stocks.id, createdStockId))

      // 利用可能在庫内での販売
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId,
        customerName: 'テスト顧客',
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 10,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 在庫確認
      const stock = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.id, createdStockId))
        .limit(1)
      const updatedStock = stock[0]

      expect(updatedStock.quantity).toBe(90) // 100 - 10
      expect(updatedStock.availableQuantity).toBe(70) // 80 - 10
      expect(updatedStock.reservedQuantity).toBe(20) // 変わらない
    })

    it('同一版・複数場所の在庫処理が正しく動作すること', async () => {
      // 別の場所に在庫を追加
      const location2Result = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト倉庫2',
          type: 'warehouse',
          isConsignment: false,
        })
        .returning()
      const location2Id = location2Result[0].id

      await drizzleService.db.insert(schema.stocks).values({
        editionId: createdEditionId,
        locationId: location2Id,
        quantity: 200,
        availableQuantity: 200,
        reservedQuantity: 0,
      })

      // 特定の場所から販売
      const createSalesData = {
        transactionType: 'event',
        eventId: createdEventId,
        locationId: createdLocationId, // 最初の倉庫から
        customerName: 'テスト顧客',
        totalAmount: 5000,
        discountAmount: 0,
        finalAmount: 5000,
        paymentMethod: 'cash',
        details: [
          {
            editionId: createdEditionId,
            quantity: 5,
            unitPrice: 1000,
            discountAmount: 0,
          },
        ],
      }

      await request(app.getHttpServer())
        .post('/sales')
        .send(createSalesData)
        .expect(302)

      // 各場所の在庫を確認
      const stock1 = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(
          and(
            eq(schema.stocks.editionId, createdEditionId),
            eq(schema.stocks.locationId, createdLocationId),
          ),
        )
        .limit(1)

      const stock2 = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(
          and(
            eq(schema.stocks.editionId, createdEditionId),
            eq(schema.stocks.locationId, location2Id),
          ),
        )
        .limit(1)

      expect(stock1[0].quantity).toBe(95) // 100 - 5
      expect(stock2[0].quantity).toBe(200) // 変わらない
    })
  })
})
