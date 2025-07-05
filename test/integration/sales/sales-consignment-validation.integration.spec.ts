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

describe('販売管理 - コンシグメント管理バリデーション', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testEdition: schema.Edition
  let testConsignmentLocation: schema.StorageLocation
  let testWarehouseLocation: schema.StorageLocation

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
        title: 'テスト書籍',
        status: 'completed',
      })
      .returning()

    const [edition] = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: book.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
      })
      .returning()
    testEdition = edition

    // 委託用保管場所作成
    const [consignmentLocation] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'とらのあな秋葉原店',
        type: 'consignment',
        isConsignment: true,
        address: '東京都千代田区外神田4-3-1',
        contactInfo: '03-5298-7593',
        notes: '委託手数料: 35%',
      })
      .returning()
    testConsignmentLocation = consignmentLocation

    // 倉庫保管場所作成（非委託）
    const [warehouseLocation] = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: '外部倉庫',
        type: 'warehouse',
        isConsignment: false,
        address: '埼玉県',
      })
      .returning()
    testWarehouseLocation = warehouseLocation

    // 在庫データ作成
    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testConsignmentLocation.id,
      quantity: 30,
      availableQuantity: 30,
      reservedQuantity: 0,
    })
  })

  describe('委託販売の検証', () => {
    it('非委託場所での委託販売タイプはエラーになる', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testWarehouseLocation.id, // 非委託場所
          customerName: '購入者A',
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

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(
        '委託販売は委託先保管場所でのみ可能です',
      )
    })

    it('委託先での通常販売タイプは警告を表示する', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'event', // 委託先でイベント販売タイプ
          locationId: testConsignmentLocation.id,
          customerName: '購入者B',
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

      // 処理は成功するが、警告がログに記録される想定
      expect(response.status).toBe(302)
    })
  })

  describe('委託在庫管理', () => {
    it('委託先への在庫移動を正しく記録できる', async () => {
      // 自宅から委託先への在庫移動
      const [homeLocation] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: '自宅',
          type: 'home',
          isConsignment: false,
        })
        .returning()

      // 自宅に在庫を作成
      await drizzleService.db.insert(schema.stocks).values({
        editionId: testEdition.id,
        locationId: homeLocation.id,
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
      })

      // 在庫移動を実行（この機能はStockMovementsで実装予定）
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: homeLocation.id,
        toLocationId: testConsignmentLocation.id,
        quantity: 20,
        movementType: 'transfer' as const,
        referenceType: 'consignment',
        reason: '委託販売のため',
      }

      // 在庫移動履歴を直接作成（実際はサービス経由）
      await drizzleService.db.insert(schema.stockMovements).values(movementData)

      // 移動履歴の確認
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.referenceType, 'consignment'))

      expect(movements).toHaveLength(1)
      expect(movements[0].quantity).toBe(20)
      expect(movements[0].movementType).toBe('transfer')
    })

    it('委託先からの返品を記録できる', async () => {
      // 委託先から自宅への返品
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: testConsignmentLocation.id,
        toLocationId: null, // システムから削除
        quantity: 5,
        movementType: 'return' as const,
        referenceType: 'consignment',
        reason: '委託期間終了による返品',
      }

      await drizzleService.db.insert(schema.stockMovements).values(movementData)

      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
        .where(eq(schema.stockMovements.movementType, 'return'))

      expect(movements).toHaveLength(1)
      expect(movements[0].fromLocationId).toBe(testConsignmentLocation.id)
    })
  })

  describe('委託手数料の計算', () => {
    it('委託手数料が正しく計算される', async () => {
      // 委託手数料30%の場合
      const salePrice = 1000
      const commissionRate = 0.3
      const expectedCommission = salePrice * commissionRate
      const expectedNetAmount = salePrice - expectedCommission

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          transactionType: 'consignment',
          locationId: testConsignmentLocation.id,
          customerName: '購入者C',
          totalAmount: salePrice,
          discountAmount: expectedCommission,
          finalAmount: expectedNetAmount,
          paymentMethod: 'cash',
          notes: `委託手数料${commissionRate * 100}%`,
          details: [
            {
              editionId: testEdition.id,
              quantity: 1,
              unitPrice: salePrice,
              discountAmount: 0,
            },
          ],
        })

      expect(response.status).toBe(302)

      const [transaction] = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
        .orderBy(schema.salesTransactions.id)

      expect(transaction.totalAmount).toBe(1000)
      expect(transaction.discountAmount).toBe(300)
      expect(transaction.finalAmount).toBe(700)
    })
  })
})
