import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('在庫移動機能基本テスト（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testEdition: schema.Edition
  let fromLocation: schema.StorageLocation
  let toLocation: schema.StorageLocation
  let _testStock: schema.Stock

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
        title: '在庫移動テスト書籍',
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

    // 3. 移動元保管場所作成（自宅）
    const fromLocationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: '自宅保管',
        type: 'home',
        isConsignment: false,
      })
      .returning()
    fromLocation = fromLocationResult[0]

    // 4. 移動先保管場所作成（倉庫）
    const toLocationResult = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: 'テスト倉庫',
        type: 'warehouse',
        isConsignment: false,
      })
      .returning()
    toLocation = toLocationResult[0]

    // 5. 移動元在庫作成
    const stockResult = await drizzleService.db
      .insert(schema.stocks)
      .values({
        editionId: testEdition.id,
        locationId: fromLocation.id,
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
        notes: '移動テスト用在庫',
      })
      .returning()
    _testStock = stockResult[0]
  })

  // Step 1: 基本機能テスト（2テスト）
  describe('GET /stock-movements', () => {
    it('在庫移動履歴一覧画面を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements')
        .expect(200)

      const html = response.text

      // タイトルとヘッダー
      expect(html).toContain('<title>在庫移動履歴</title>')
      expect(html).toContain('<h1>在庫移動履歴</h1>')

      // 基本的なテーブル構造または空メッセージの確認
      if (html.includes('在庫移動履歴が登録されていません')) {
        expect(html).toContain('在庫移動履歴が登録されていません')
      } else {
        expect(html).toContain('版')
        expect(html).toContain('移動元')
        expect(html).toContain('移動先')
        expect(html).toContain('数量')
        expect(html).toContain('移動タイプ')
        expect(html).toContain('移動日時')
      }
    })
  })

  describe('POST /stock-movements', () => {
    it('在庫移動記録を正常に作成する', async () => {
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 20,
        movementType: 'transfer',
        reason: 'テスト移動記録',
      }

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementData)
        .expect(302)

      // 移動履歴一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/stock-movements')

      // 作成された移動記録が一覧に表示されることを確認
      const listResponse = await request(app.getHttpServer())
        .get('/stock-movements')
        .expect(200)

      expect(listResponse.text).toContain('在庫移動テスト書籍（初版）')
      expect(listResponse.text).toContain('自宅保管')
      expect(listResponse.text).toContain('テスト倉庫')
      expect(listResponse.text).toContain('20')
      expect(listResponse.text).toContain('移動')
      expect(listResponse.text).toContain('テスト移動記録')
    })
  })

  // Step 2: バリデーションテスト（3テスト）
  describe('POST /stock-movements - バリデーションエラー', () => {
    it('必須項目が未送信の場合はバリデーションエラーを表示する', async () => {
      const movementData = {
        // editionId, fromLocationId, toLocationIdを送信しない
        quantity: 20,
        movementType: 'transfer',
      }

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementData)

      // ValidationExceptionFilterにより200でエラーページが返される
      expect(response.status).toBe(200)

      // バリデーションエラーメッセージが含まれることを確認
      const html = response.text
      expect(html).toContain('版IDは整数で入力してください')
      expect(html).toContain('移動元保管場所は必須です')
      expect(html).toContain('移動先保管場所は必須です')
    })

    it('数量制約違反の場合はバリデーションエラーを表示する', async () => {
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: -10, // 負の数
        movementType: 'transfer',
      }

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementData)
        .expect(200) // ValidationExceptionFilterにより200

      // 数量制約のエラーメッセージが含まれることを確認
      expect(response.text).toContain('移動数量は1以上で入力してください')
    })

    it('無効な移動タイプの場合はバリデーションエラーを表示する', async () => {
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 20,
        movementType: 'invalid_type', // 無効な移動タイプ
      }

      const response = await request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementData)
        .expect(200) // ValidationExceptionFilterにより200

      // 移動タイプのエラーメッセージが含まれることを確認
      expect(response.text).toContain('移動タイプを正しく選択してください')
    })
  })

  // Step 3: 全機能テスト（3テスト）
  describe('在庫移動機能全機能テスト', () => {
    let createdMovementId: number

    beforeEach(async () => {
      // 各テスト用の移動記録を作成
      const movementData = {
        editionId: testEdition.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 30,
        movementType: 'transfer',
        reason: 'テスト用移動記録',
      }

      await request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementData)
        .expect(302)

      // 作成された移動記録IDを取得
      const movements = await drizzleService.db
        .select()
        .from(schema.stockMovements)
      expect(movements.length).toBeGreaterThan(0)
      createdMovementId = movements[0].id
    })

    it('版別移動履歴フィルタリングが正常に動作する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements?editionId=${testEdition.id}`)
        .expect(200)

      const html = response.text

      // フィルタリング結果の確認
      expect(html).toContain('<title>在庫移動履歴</title>')
      expect(html).toContain('在庫移動テスト書籍（初版）')
      expect(html).toContain('自宅保管')
      expect(html).toContain('テスト倉庫')

      // フィルター値が保持されていることを確認
      expect(html).toContain(`value="${testEdition.id}"`)
    })

    it('移動タイプ別フィルタリングが正常に動作する', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements?movementType=transfer')
        .expect(200)

      const html = response.text

      // フィルタリング結果の確認
      expect(html).toContain('<title>在庫移動履歴</title>')
      expect(html).toContain('移動')

      // フィルター値が保持されていることを確認
      expect(html).toContain('value="transfer"')
    })

    it('移動記録詳細画面が正常に表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-movements/${createdMovementId}`)
        .expect(200)

      const html = response.text

      // 詳細画面の基本要素
      expect(html).toContain('在庫移動記録詳細')

      // 移動記録情報の表示
      expect(html).toContain('在庫移動テスト書籍（初版）')
      expect(html).toContain('自宅保管')
      expect(html).toContain('テスト倉庫')
      expect(html).toContain('30')
      expect(html).toContain('移動')
      expect(html).toContain('テスト用移動記録')

      // ナビゲーションボタン
      expect(html).toContain('一覧に戻る')
    })
  })
})
