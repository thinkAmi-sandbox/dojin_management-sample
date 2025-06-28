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

  // Step 2: バリデーションテスト（3テスト）
  describe('POST /stocks - バリデーションエラー', () => {
    it('必須項目が未送信の場合はバリデーションエラーを表示する', async () => {
      const stockData = {
        // editionIdとlocationIdを送信しない
        quantity: 100,
      }

      const response = await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)

      // ValidationExceptionFilterにより200でエラーページが返される
      expect(response.status).toBe(200)

      // バリデーションエラーメッセージが含まれることを確認
      const html = response.text

      // 未送信の場合、整数変換エラーが発生する
      expect(html).toContain('版IDは整数で入力してください')
      expect(html).toContain('保管場所IDは整数で入力してください')
    })

    it('数量制約違反の場合はバリデーションエラーを表示する', async () => {
      const stockData = {
        editionId: testEdition.id,
        locationId: testStorageLocation.id,
        quantity: -10, // 負の数
        reservedQuantity: -5, // 負の数
      }

      const response = await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)
        .expect(200) // ValidationExceptionFilterにより200

      // 数量制約のエラーメッセージが含まれることを確認
      expect(response.text).toContain('在庫数は0以上で入力してください')
      expect(response.text).toContain('予約済み数は0以上で入力してください')
    })

    it('重複する在庫作成時はエラーを表示する', async () => {
      // 最初の在庫を作成
      const stockData = {
        editionId: testEdition.id,
        locationId: testStorageLocation.id,
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
      }

      await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)
        .expect(302)

      // 同じ版・同じ場所で再度作成を試行
      const response = await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)
        .expect(200) // ValidationExceptionFilterにより200

      // 重複エラーメッセージが含まれることを確認
      expect(response.text).toContain(
        'この版と保管場所の組み合わせの在庫は既に存在します',
      )
    })
  })

  // Step 3: 全機能テスト（5テスト）
  describe('在庫管理全機能テスト', () => {
    let createdStockId: number

    beforeEach(async () => {
      // 各テスト用の在庫を作成
      const stockData = {
        editionId: testEdition.id,
        locationId: testStorageLocation.id,
        quantity: 100,
        reservedQuantity: 20,
        availableQuantity: 80,
        notes: 'テスト用在庫',
      }

      await request(app.getHttpServer())
        .post('/stocks')
        .send(stockData)
        .expect(302)

      // 作成された在庫IDを取得（一覧から）
      await request(app.getHttpServer()).get('/stocks').expect(200)

      // 在庫が1件作成されていることを確認し、IDを特定する
      const stocks = await drizzleService.db.select().from(schema.stocks)
      expect(stocks.length).toBeGreaterThan(0)
      createdStockId = stocks[0].id
    })

    it('在庫詳細表示が正常に動作する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stocks/${createdStockId}`)
        .expect(200)

      const html = response.text

      // 詳細画面の基本要素
      expect(html).toContain('在庫詳細')

      // 在庫情報の表示
      expect(html).toContain('テスト書籍（初版）')
      expect(html).toContain('テスト自宅')
      expect(html).toContain('100')
      expect(html).toContain('80')
      expect(html).toContain('テスト用在庫')

      // アクションボタン
      expect(html).toContain('編集')
      expect(html).toContain('削除')
      expect(html).toContain('一覧に戻る')
    })

    it('棚卸画面が正常に表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/check')
        .expect(200)

      const html = response.text

      // 棚卸画面の基本要素
      expect(html).toContain('<title>棚卸し・在庫チェック</title>')
      expect(html).toContain('棚卸し・在庫チェック')

      // 在庫一覧表示
      expect(html).toContain('テスト書籍（初版）')
      expect(html).toContain('テスト自宅')
    })

    it('版別在庫フィルタリングが正常に動作する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stocks?editionId=${testEdition.id}`)
        .expect(200)

      const html = response.text

      // フィルタリング結果の確認
      expect(html).toContain('<title>在庫一覧</title>')
      expect(html).toContain('テスト書籍（初版）')
      expect(html).toContain('テスト自宅')

      // フィルター値が保持されていることを確認
      expect(html).toContain(`value="${testEdition.id}"`)
    })

    it('在庫数量更新が正常に動作する', async () => {
      const updateData = {
        _method: 'PUT',
        quantity: 150,
        reservedQuantity: 30,
        availableQuantity: 120,
        notes: '更新されたテスト在庫',
      }

      const response = await request(app.getHttpServer())
        .post(`/stocks/${createdStockId}`)
        .send(updateData)
        .expect(302)

      // 詳細画面にリダイレクトされることを確認
      expect(response.header.location).toBe(`/stocks/${createdStockId}`)

      // 更新された内容が表示されることを確認
      const detailResponse = await request(app.getHttpServer())
        .get(`/stocks/${createdStockId}`)
        .expect(200)

      expect(detailResponse.text).toContain('150')
      expect(detailResponse.text).toContain('120')
      expect(detailResponse.text).toContain('更新されたテスト在庫')
    })

    it('在庫削除が正常に動作する', async () => {
      const deleteData = {
        _method: 'DELETE',
      }

      const response = await request(app.getHttpServer())
        .post(`/stocks/${createdStockId}`)
        .send(deleteData)
        .expect(302)

      // 一覧画面にリダイレクトされることを確認
      expect(response.header.location).toBe('/stocks')

      // 削除されていることを確認（404エラーが返される）
      await request(app.getHttpServer())
        .get(`/stocks/${createdStockId}`)
        .expect(404)
    })
  })
})
