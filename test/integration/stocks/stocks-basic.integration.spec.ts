import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('在庫管理基本機能（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testEdition: schema.Edition
  let testStorageLocation: schema.StorageLocation

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

    // テスト用データの作成
    // 1. 書籍作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
        status: 'completed',
      })
      .returning()
    const testBook = bookResult[0]

    // 2. 版作成
    const editionResult = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        pageCount: 200,
        basePrice: 1000,
        publishDate: '2024-06-01',
      })
      .returning()
    testEdition = editionResult[0]

    // 3. 保管場所作成
    const locationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト自宅',
        type: 'home',
        isConsignment: false,
      })
      .returning()
    testStorageLocation = locationResult[0]
  })

  // Step 1: 基本機能テスト（2テスト）
  describe('GET /stocks', () => {
    it('在庫一覧画面を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks')
        .expect(200)

      const html = response.text

      // タイトルとヘッダー
      expect(html).toContain('<title>在庫一覧</title>')
      expect(html).toContain('<h1>在庫一覧</h1>')

      // 基本的なテーブル構造または空メッセージの確認
      // データがなければ空メッセージが表示されるはず
      if (html.includes('在庫データが登録されていません')) {
        expect(html).toContain('在庫データが登録されていません')
      } else {
        expect(html).toContain('版')
        expect(html).toContain('保管場所')
        expect(html).toContain('在庫数')
        expect(html).toContain('販売可能数')
      }
    })
  })

  describe('POST /stocks', () => {
    it('新規在庫を正常に作成する', async () => {
      const stockData = {
        editionId: testEdition.id,
        locationId: testStorageLocation.id,
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
        notes: 'テスト在庫作成',
      }

      const response = await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)
        .expect(302)

      // 在庫一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/stocks')

      // 作成された在庫が一覧に表示されることを確認
      const listResponse = await request(app.getHttpServer())
        .get('/stocks')
        .expect(200)
      
      expect(listResponse.text).toContain('テスト書籍（初版）')
      expect(listResponse.text).toContain('テスト自宅')
      expect(listResponse.text).toContain('100')
      expect(listResponse.text).toContain('90')
    })
  })
})
