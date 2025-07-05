import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { and, eq, gte, lte } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('販売管理 - コンシグメント管理統合機能', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: schema.Book
  let testEdition: schema.Edition
  let testConsignmentLocation1: schema.StorageLocation
  let testConsignmentLocation2: schema.StorageLocation
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

    // テスト用書籍・版作成
    const [book] = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト同人誌',
        description: '人気の同人誌',
        status: 'completed',
      })
      .returning()
    testBook = book

    const [edition] = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1500,
        pageCount: 100,
      })
      .returning()
    testEdition = edition

    // 複数の委託先作成
    const [consignmentLocation1] = await drizzleService.db
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
    testConsignmentLocation1 = consignmentLocation1

    const [consignmentLocation2] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'とらのあな新宿店',
        type: 'consignment',
        isConsignment: true,
        address: '東京都新宿区西新宿1-12-8',
        contactInfo: '03-5339-1040',
        notes: '委託手数料: 35%',
      })
      .returning()
    testConsignmentLocation2 = consignmentLocation2

    const [homeLocation] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: '自宅',
        type: 'home',
        isConsignment: false,
      })
      .returning()
    testHomeLocation = homeLocation

    // 各場所に在庫を配置
    await drizzleService.db.insert(schema.stocks).values([
      {
        editionId: testEdition.id,
        locationId: testConsignmentLocation1.id,
        quantity: 30,
        availableQuantity: 30,
        reservedQuantity: 0,
      },
      {
        editionId: testEdition.id,
        locationId: testConsignmentLocation2.id,
        quantity: 20,
        availableQuantity: 20,
        reservedQuantity: 0,
      },
      {
        editionId: testEdition.id,
        locationId: testHomeLocation.id,
        quantity: 50,
        availableQuantity: 50,
        reservedQuantity: 0,
      },
    ])
  })

  describe('委託販売レポート', () => {
    it.skip('委託先別の売上レポートを生成できる（Phase 4-5拡張機能として実装予定）', async () => {
      // 各委託先で販売を作成
      await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation1.id,
          customerName: '購入者A',
          totalAmount: 3000,
          discountAmount: 900, // 30%手数料
          finalAmount: 2100,
          paymentMethod: 'cash',
          details: [
            {
              editionId: testEdition.id,
              quantity: 2,
              unitPrice: 1500,
              discountAmount: 0,
            },
          ],
        })

      await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation2.id,
          customerName: '購入者B',
          totalAmount: 1500,
          discountAmount: 525, // 35%手数料
          finalAmount: 975,
          paymentMethod: 'cash',
          details: [
            {
              editionId: testEdition.id,
              quantity: 1,
              unitPrice: 1500,
              discountAmount: 0,
            },
          ],
        })

      // レポートAPIを呼び出し
      const response = await request(app.getHttpServer())
        .get('/sales/reports')
        .query({ transactionType: 'consignment' })

      expect(response.status).toBe(200)
      expect(response.text).toContain('メロンブックス秋葉原店')
      expect(response.text).toContain('とらのあな新宿店')
    })

    it('期間指定で委託販売を絞り込める', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 今日の販売を作成
      await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation1.id,
          customerName: '購入者C',
          totalAmount: 1500,
          discountAmount: 450,
          finalAmount: 1050,
          paymentMethod: 'cash',
          details: [
            {
              editionId: testEdition.id,
              quantity: 1,
              unitPrice: 1500,
              discountAmount: 0,
            },
          ],
        })

      // 期間指定でフィルタリング
      const transactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .where(
          and(
            eq(schema.salesTransactions.transactionType, 'consignment'),
            gte(schema.salesTransactions.transactionDate, yesterday),
            lte(schema.salesTransactions.transactionDate, tomorrow),
          ),
        )

      expect(transactions).toHaveLength(1)
      expect(transactions[0].locationId).toBe(testConsignmentLocation1.id)
    })
  })

  describe('在庫管理との統合', () => {
    it('複数委託先への一括在庫移動ができる', async () => {
      // 自宅から複数委託先への移動を記録
      const movements = [
        {
          editionId: testEdition.id,
          fromLocationId: testHomeLocation.id,
          toLocationId: testConsignmentLocation1.id,
          quantity: 10,
          movementType: 'transfer' as const,
          referenceType: 'consignment',
          reason: 'メロンブックス追加納品',
        },
        {
          editionId: testEdition.id,
          fromLocationId: testHomeLocation.id,
          toLocationId: testConsignmentLocation2.id,
          quantity: 5,
          movementType: 'transfer' as const,
          referenceType: 'consignment',
          reason: 'とらのあな追加納品',
        },
      ]

      for (const movement of movements) {
        await drizzleService.db.insert(schema.stockMovements).values(movement)
      }

      // 移動履歴の確認
      const recordedMovements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.referenceType, 'consignment'))

      expect(recordedMovements).toHaveLength(2)
      expect(recordedMovements.map((m) => m.quantity)).toEqual([10, 5])
    })

    it('委託先在庫の一覧表示ができる', async () => {
      // 委託先の在庫を取得
      const consignmentStocks = await drizzleService.db
        .select({
          locationName: schema.storageLocations.name,
          locationType: schema.storageLocations.type,
          quantity: schema.stocks.quantity,
          availableQuantity: schema.stocks.availableQuantity,
        })
        .from(schema.stocks)
        .innerJoin(
          schema.storageLocations,
          eq(schema.stocks.locationId, schema.storageLocations.id),
        )
        .where(eq(schema.storageLocations.isConsignment, true))

      expect(consignmentStocks).toHaveLength(2)
      expect(
        consignmentStocks.every((s) => s.locationType === 'consignment'),
      ).toBe(true)

      const totalConsignmentStock = consignmentStocks.reduce(
        (sum, stock) => sum + stock.quantity,
        0,
      )
      expect(totalConsignmentStock).toBe(50) // 30 + 20
    })
  })

  describe('委託販売の削除と在庫復元', () => {
    it('委託販売を削除すると在庫が復元される', async () => {
      // 委託販売を作成
      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation1.id,
          customerName: '購入者D',
          totalAmount: 3000,
          discountAmount: 900,
          finalAmount: 2100,
          paymentMethod: 'cash',
          details: [
            {
              editionId: testEdition.id,
              quantity: 2,
              unitPrice: 1500,
              discountAmount: 0,
            },
          ],
        })

      expect(createResponse.status).toBe(302)

      // 作成された販売取引を取得
      const [transaction] = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .orderBy(schema.salesTransactions.id)

      // 在庫が減少したことを確認
      const [stockAfterSale] = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.locationId, testConsignmentLocation1.id))

      expect(stockAfterSale.quantity).toBe(28) // 30 - 2

      // 販売取引を削除
      const deleteResponse = await request(app.getHttpServer()).delete(
        `/sales/${transaction.id}`,
      )

      expect(deleteResponse.status).toBe(302)

      // 在庫が復元されたことを確認
      const [stockAfterDelete] = await drizzleService.db
        .select()
        .from(schema.stocks)
        .where(eq(schema.stocks.locationId, testConsignmentLocation1.id))

      expect(stockAfterDelete.quantity).toBe(30) // 元に戻る

      // 返品履歴が記録されたことを確認
      const returnMovements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.movementType, 'return'))

      expect(returnMovements).toHaveLength(1)
      expect(returnMovements[0].quantity).toBe(2)
      expect(returnMovements[0].toLocationId).toBe(testConsignmentLocation1.id)
    })
  })

  describe('委託販売の詳細表示', () => {
    it('委託販売の詳細情報を表示できる', async () => {
      // 委託販売を作成
      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation1.id,
          customerName: '購入者E',
          customerEmail: 'customer@example.com',
          totalAmount: 4500,
          discountAmount: 1350, // 30%手数料
          finalAmount: 3150,
          paymentMethod: 'credit',
          notes: '委託販売（メロンブックス）',
          details: [
            {
              editionId: testEdition.id,
              quantity: 3,
              unitPrice: 1500,
              discountAmount: 0,
            },
          ],
        })

      expect(createResponse.status).toBe(302)

      // 作成された販売取引を取得
      const [transaction] = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .orderBy(schema.salesTransactions.id)

      // 詳細表示
      const detailResponse = await request(app.getHttpServer()).get(
        `/sales/${transaction.id}`,
      )

      expect(detailResponse.status).toBe(200)
      expect(detailResponse.text).toContain('委託販売')
      expect(detailResponse.text).toContain('メロンブックス秋葉原店')
      expect(detailResponse.text).toContain('手数料: ¥1,350')
      expect(detailResponse.text).toContain('実収入: ¥3,150')
    })
  })
})
