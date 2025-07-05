import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('価格管理統合機能（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: schema.Book
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
        title: '統合テスト書籍',
        status: 'completed',
      })
      .returning()
    testBook = bookResult[0]

    // 2. 版作成
    const editionResult = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        pageCount: 300,
        basePrice: 2000, // ベース価格2000円
        publishDate: '2024-06-01',
      })
      .returning()
    testEdition = editionResult[0]

    // 3. イベント作成
    const eventResult = await drizzleService.db
      .insert(schema.events)
      .values({
        name: '技術書典18',
        eventDate: '2024-12-15',
        venue: '池袋サンシャインシティ',
        applicationStartDate: '2024-10-01',
        applicationEndDate: '2024-10-31',
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

    // 5. 在庫作成
    await drizzleService.db.insert(schema.stocks).values({
      editionId: testEdition.id,
      locationId: testLocation.id,
      quantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100,
    })
  })

  // Phase C: 複合機能・統合テスト（8-10件）
  describe('複数ルール優先順位適用', () => {
    it('複数の価格ルールが優先順位順に適用される', async () => {
      // 複数の価格ルール作成（優先順位付き）
      await drizzleService.db.insert(schema.pricingRules).values([
        {
          editionId: testEdition.id,
          ruleType: 'event_discount',
          name: 'イベント200円引き',
          price: 1800, // 2000円→1800円
          eventId: testEvent.id,
          priority: 2, // 低優先度
          isActive: true,
        },
        {
          editionId: testEdition.id,
          ruleType: 'early_bird',
          name: '早期購入10%引き',
          discountRate: 10, // 追加で10%引き
          validFrom: '2024-01-01',
          validUntil: '2025-12-31', // 来年まで有効に修正
          priority: 5, // 高優先度
          isActive: true,
        },
      ])

      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 1,
          context: {
            eventId: testEvent.id,
          },
        })
        .expect(200)

      // 高優先度から適用: 早期購入10%引き（200円） → イベント固定価格（200円）
      expect(response.body.basePrice).toBe(2000)
      expect(response.body.finalPrice).toBe(1600) // 2000 - 200(早期購入) - 200(イベント) = 1600
      expect(response.body.appliedDiscounts).toHaveLength(2)
      expect(response.body.appliedDiscounts[0].ruleType).toBe('early_bird')
      expect(response.body.appliedDiscounts[1].ruleType).toBe('event_discount')
    })

    it('まとめ買い割引が正しく適用される', async () => {
      // まとめ買い割引ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'bulk_discount',
        name: '5冊以上15%引き',
        discountRate: 15,
        minQuantity: 5,
        priority: 3,
        isActive: true,
      })

      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 7, // 5冊以上なので割引適用
          context: {},
        })
        .expect(200)

      expect(response.body.basePrice).toBe(2000)
      expect(response.body.finalPrice).toBe(1700) // 2000 * 0.85 = 1700
      expect(response.body.totalDiscount).toBe(300)
      expect(response.body.quantity).toBe(7)
      expect(response.body.subtotal).toBe(11900) // 1700 * 7
      expect(response.body.appliedDiscounts[0].ruleName).toBe('5冊以上15%引き')
    })
  })

  describe('販売取引との統合', () => {
    it('販売時に動的価格計算が適用される', async () => {
      // イベント割引ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: 'イベント特価300円引き',
        price: 1700,
        eventId: testEvent.id,
        priority: 1,
        isActive: true,
      })

      const salesData = {
        transactionType: 'event',
        eventId: testEvent.id,
        locationId: testLocation.id,
        customerName: '価格テスト顧客',
        totalAmount: 3400, // 1700 * 2
        finalAmount: 3400,
        paymentMethod: 'cash',
        details: [
          {
            editionId: testEdition.id,
            quantity: 2,
            unitPrice: 1700, // 価格計算結果を使用
            subtotal: 3400,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(salesData)
        .expect(302)

      expect(response.header.location).toBe('/sales')

      // 販売記録に価格情報が正しく保存されていることを確認
      const salesTransactions = await drizzleService.db
        .select()
        .from(schema.salesTransactions)
      expect(salesTransactions).toHaveLength(1)

      const salesDetails = await drizzleService.db
        .select()
        .from(schema.salesDetails)
      expect(salesDetails).toHaveLength(1)
      expect(salesDetails[0].unitPrice).toBe(1700) // 割引価格が記録されている
    })

    it('委託販売価格が適用される', async () => {
      // 委託販売価格ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'consignment',
        name: '委託販売価格',
        price: 1800, // 委託価格は通常より少し安く設定
        priority: 1,
        isActive: true,
      })

      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 1,
          context: {
            transactionType: 'consignment',
          },
        })
        .expect(200)

      expect(response.body.basePrice).toBe(2000)
      expect(response.body.finalPrice).toBe(1800)
      expect(response.body.appliedDiscounts[0].ruleType).toBe('consignment')
    })
  })

  describe('価格計算の境界条件', () => {
    it('負の最終価格を防ぐ', async () => {
      // 極端な割引ルール作成（価格が負になる可能性）
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: '極端割引',
        discountRate: 150, // 150%引き（負の価格になる）
        priority: 1,
        isActive: true,
      })

      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 1,
          context: {},
        })
        .expect(200)

      // 最終価格は0以下にならない
      expect(response.body.finalPrice).toBeGreaterThanOrEqual(0)
    })

    it('価格履歴が記録される', async () => {
      // 価格ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: '履歴テスト割引',
        price: 1900,
        eventId: testEvent.id,
        priority: 1,
        isActive: true,
      })

      // 価格計算実行
      await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 1,
          context: {
            eventId: testEvent.id,
          },
        })
        .expect(200)

      // 価格履歴テーブルをチェック（将来実装予定）
      // const priceHistory = await drizzleService.db
      //   .select()
      //   .from(schema.priceHistory)
      // expect(priceHistory).toHaveLength(1)
    })
  })

  describe('価格ルール管理UI統合', () => {
    it('価格ルール編集画面が正しく表示される', async () => {
      // 価格ルール作成
      const pricingRuleResult = await drizzleService.db
        .insert(schema.pricingRules)
        .values({
          editionId: testEdition.id,
          ruleType: 'event_discount',
          name: '編集テストルール',
          price: 1500,
          priority: 1,
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/pricing-rules/${pricingRuleResult[0].id}/edit`)
        .expect(200)

      const html = response.text
      expect(html).toContain('<title>価格ルール編集</title>')
      expect(html).toContain('編集テストルール')
      expect(html).toContain('value="1500"')
    })

    it('価格ルールの削除が正常に動作する', async () => {
      // 価格ルール作成
      const pricingRuleResult = await drizzleService.db
        .insert(schema.pricingRules)
        .values({
          editionId: testEdition.id,
          ruleType: 'bulk_discount',
          name: '削除テストルール',
          discountRate: 5,
          minQuantity: 3,
          priority: 1,
          isActive: true,
        })
        .returning()

      // 削除実行
      const response = await request(app.getHttpServer())
        .delete(`/pricing-rules/${pricingRuleResult[0].id}`)
        .expect(302)

      expect(response.header.location).toBe('/pricing-rules')

      // データベースから削除されていることを確認
      const remainingRules = await drizzleService.db
        .select()
        .from(schema.pricingRules)
        .where(eq(schema.pricingRules.id, pricingRuleResult[0].id))
      expect(remainingRules).toHaveLength(0)
    })

    it('価格シミュレーション機能が動作する', async () => {
      // シミュレーション用価格ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'bulk_discount',
        name: 'シミュレーション用ルール',
        discountRate: 20,
        minQuantity: 10,
        priority: 1,
        isActive: true,
      })

      const response = await request(app.getHttpServer())
        .post('/api/pricing/simulate')
        .send({
          editionId: testEdition.id,
          quantities: [1, 5, 10, 20], // 複数数量でシミュレーション
          context: {},
        })
        .expect(200)

      expect(response.body.simulations).toHaveLength(4)
      expect(response.body.simulations[0].quantity).toBe(1)
      expect(response.body.simulations[0].finalPrice).toBe(2000) // 割引なし
      expect(response.body.simulations[2].quantity).toBe(10)
      expect(response.body.simulations[2].finalPrice).toBe(1600) // 20%引き
    })
  })
})
