import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('価格管理バリデーション・エラーハンドリング（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: schema.Book
  let testEdition: schema.Edition
  let testEvent: schema.Event

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
        title: 'バリデーションテスト書籍',
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
        pageCount: 200,
        basePrice: 1500,
        publishDate: '2024-06-01',
      })
      .returning()
    testEdition = editionResult[0]

    // 3. イベント作成
    const eventResult = await drizzleService.db
      .insert(schema.events)
      .values({
        name: 'コミケ101',
        eventDate: '2024-08-15',
        venue: 'ビッグサイト',
        applicationStartDate: '2024-06-01',
        applicationEndDate: '2024-06-30',
      })
      .returning()
    testEvent = eventResult[0]
  })

  // Phase B: バリデーション・エラーハンドリングテスト（3-4件）
  describe('価格ルール作成バリデーション', () => {
    it('必須フィールドが不足している場合にエラーを返す', async () => {
      const invalidPricingRuleData = {
        // editionId が不足
        ruleType: 'event_discount',
        name: '不正なルール',
        price: 800,
      }

      const response = await request(app.getHttpServer())
        .post('/pricing-rules')
        .send(invalidPricingRuleData)
        .expect(200) // ValidationExceptionFilterにより200でHTMLエラーページが返される

      expect(response.text).toContain('版IDは必須です')
      expect(response.text).toContain('新規価格ルール作成')
    })

    it('無効な価格ルールタイプの場合にエラーを返す', async () => {
      const invalidPricingRuleData = {
        editionId: testEdition.id,
        ruleType: 'invalid_type', // 無効なルールタイプ
        name: '無効タイプルール',
        price: 800,
      }

      const response = await request(app.getHttpServer())
        .post('/pricing-rules')
        .send(invalidPricingRuleData)
        .expect(200) // ValidationExceptionFilterにより200でHTMLエラーページが返される

      expect(response.text).toContain('価格ルールタイプが無効です')
      expect(response.text).toContain('新規価格ルール作成')
    })

    it('負の価格を設定した場合にエラーを返す', async () => {
      const invalidPricingRuleData = {
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: '負の価格ルール',
        price: -100, // 負の価格
        priority: 1,
      }

      const response = await request(app.getHttpServer())
        .post('/pricing-rules')
        .send(invalidPricingRuleData)
        .expect(200) // ValidationExceptionFilterにより200でHTMLエラーページが返される

      expect(response.text).toContain('価格は0以上で入力してください')
      expect(response.text).toContain('新規価格ルール作成')
    })

    it('存在しない版IDを指定した場合にエラーを返す', async () => {
      const invalidPricingRuleData = {
        editionId: 99999, // 存在しない版ID
        ruleType: 'event_discount',
        name: '存在しない版ルール',
        price: 800,
        priority: 1,
      }

      const response = await request(app.getHttpServer())
        .post('/pricing-rules')
        .send(invalidPricingRuleData)
        .expect(404)

      expect(response.body.message).toContain('指定された版が見つかりません')
    })
  })

  describe('期限切れ価格ルールの処理', () => {
    it('期限切れの価格ルールは適用されない', async () => {
      // 期限切れの価格ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'early_bird',
        name: '期限切れ早期割引',
        discountRate: 20,
        validFrom: '2024-01-01',
        validUntil: '2024-05-31', // 既に期限切れ
        priority: 1,
        isActive: true,
      })

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

      // 期限切れルールは適用されず、ベース価格が返される
      expect(response.body.basePrice).toBe(1500)
      expect(response.body.finalPrice).toBe(1500)
      expect(response.body.totalDiscount).toBe(0)
      expect(response.body.appliedDiscounts).toHaveLength(0)
    })

    it('非アクティブな価格ルールは適用されない', async () => {
      // 非アクティブな価格ルール作成
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: '非アクティブ割引',
        price: 1200,
        eventId: testEvent.id,
        priority: 1,
        isActive: false, // 非アクティブ
      })

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

      // 非アクティブルールは適用されず、ベース価格が返される
      expect(response.body.basePrice).toBe(1500)
      expect(response.body.finalPrice).toBe(1500)
      expect(response.body.totalDiscount).toBe(0)
      expect(response.body.appliedDiscounts).toHaveLength(0)
    })
  })

  describe('まとめ買い割引の最小数量チェック', () => {
    it('最小数量に達していない場合は割引が適用されない', async () => {
      // まとめ買い割引ルール作成（5冊以上で10%引き）
      await drizzleService.db.insert(schema.pricingRules).values({
        editionId: testEdition.id,
        ruleType: 'bulk_discount',
        name: '5冊以上10%引き',
        discountRate: 10,
        minQuantity: 5, // 最小5冊
        priority: 1,
        isActive: true,
      })

      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 3, // 最小数量に達していない
          context: {},
        })
        .expect(200)

      // 最小数量に達していないため割引適用されない
      expect(response.body.basePrice).toBe(1500)
      expect(response.body.finalPrice).toBe(1500)
      expect(response.body.totalDiscount).toBe(0)
      expect(response.body.appliedDiscounts).toHaveLength(0)
    })
  })
})
