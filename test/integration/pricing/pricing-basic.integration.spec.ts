import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('価格管理基本機能（Integration）', () => {
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
        title: '価格テスト書籍',
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
        basePrice: 1000, // ベース価格1000円
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
  })

  // Phase A: 基本機能テスト（2-3件）
  describe('価格計算基本機能', () => {
    it('価格ルールが存在しない場合はベース価格を返す', async () => {
      // 価格計算API（将来実装予定）をテスト
      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: testEdition.id,
          quantity: 1,
          context: {
            eventId: testEvent.id,
            transactionType: 'event',
          },
        })
        .expect(200)

      expect(response.body.basePrice).toBe(1000)
      expect(response.body.finalPrice).toBe(1000)
      expect(response.body.totalDiscount).toBe(0)
      expect(response.body.appliedDiscounts).toHaveLength(0)
      expect(response.body.quantity).toBe(1)
      expect(response.body.subtotal).toBe(1000)
    })

    it('単一の割引ルールが適用される', async () => {
      // 1. イベント割引ルール作成
      await drizzleService.db
        .insert(schema.pricingRules)
        .values({
          editionId: testEdition.id,
          ruleType: 'event_discount',
          name: 'イベント限定100円引き',
          discountRate: null,
          price: 900, // 固定価格900円
          eventId: testEvent.id,
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
            transactionType: 'event',
          },
        })
        .expect(200)

      expect(response.body.basePrice).toBe(1000)
      expect(response.body.finalPrice).toBe(900)
      expect(response.body.totalDiscount).toBe(100)
      expect(response.body.appliedDiscounts).toHaveLength(1)
      expect(response.body.appliedDiscounts[0].ruleName).toBe('イベント限定100円引き')
      expect(response.body.appliedDiscounts[0].ruleType).toBe('event_discount')
      expect(response.body.subtotal).toBe(900)
    })

    it('存在しない版IDに対してエラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pricing/calculate')
        .send({
          editionId: 99999, // 存在しない版ID
          quantity: 1,
          context: {
            eventId: testEvent.id,
          },
        })
        .expect(404)

      expect(response.body.message).toContain('版が見つかりません')
    })
  })

  describe('価格ルール管理基本機能', () => {
    it('価格ルール一覧画面を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/pricing-rules')
        .expect(200)

      const html = response.text
      expect(html).toContain('<title>価格ルール一覧</title>')
      expect(html).toContain('<h1>価格ルール一覧</h1>')
      expect(html).toContain('新規価格ルール作成')
    })

    it('新規価格ルールを作成する', async () => {
      const pricingRuleData = {
        editionId: testEdition.id,
        ruleType: 'event_discount',
        name: 'テストイベント割引',
        price: 800,
        eventId: testEvent.id,
        priority: 1,
        isActive: true,
      }

      const response = await request(app.getHttpServer())
        .post('/pricing-rules')
        .send(pricingRuleData)
        .expect(302)

      expect(response.header.location).toBe('/pricing-rules')

      // データベースに正しく保存されていることを確認
      const pricingRules = await drizzleService.db
        .select()
        .from(schema.pricingRules)
      expect(pricingRules).toHaveLength(1)
      expect(pricingRules[0].ruleType).toBe('event_discount')
      expect(pricingRules[0].name).toBe('テストイベント割引')
      expect(pricingRules[0].price).toBe(800)
    })
  })
})