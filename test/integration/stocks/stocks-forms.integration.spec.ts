import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Stocks Forms', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

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
  })

  describe('GET /stocks/new - 新規在庫登録フォーム表示', () => {
    it('新規在庫登録フォームを表示する', async () => {
      // テスト用データ作成
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
          printingCost: 500,
          publishDate: '2025-01-01',
        })
        .returning()

      const [storageLocation] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト倉庫',
          type: 'warehouse',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get('/stocks/new')
        .expect(200)

      expect(response.text).toContain('<title>新規在庫登録</title>')
      expect(response.text).toContain('版を選択')
      expect(response.text).toContain('保管場所を選択')
      expect(response.text).toContain('在庫数')
      expect(response.text).toContain('予約済み数')
      expect(response.text).toContain('販売可能数')
      expect(response.text).toContain('備考')
      expect(response.text).toContain(edition.versionName)
      expect(response.text).toContain(storageLocation.name)
    })

    it('在庫なし時に適切なメッセージを表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/new')
        .expect(200)

      expect(response.text).toContain('<title>新規在庫登録</title>')
      expect(response.text).toContain('版が登録されていません')
      expect(response.text).toContain('保管場所が登録されていません')
    })
  })

  describe('GET /stocks/:id/edit - 在庫編集フォーム表示', () => {
    it('在庫編集フォームを表示する', async () => {
      // テスト用データ作成
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
          printingCost: 500,
          publishDate: '2025-01-01',
        })
        .returning()

      const [storageLocation] = await drizzleService.db
        .insert(schema.storageLocations)
        .values({
          name: 'テスト倉庫',
          type: 'warehouse',
        })
        .returning()

      // 在庫データ作成
      const [stock] = await drizzleService.db
        .insert(schema.stocks)
        .values({
          editionId: edition.id,
          locationId: storageLocation.id,
          quantity: 50,
          reservedQuantity: 10,
          availableQuantity: 40,
          notes: 'テスト在庫',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/stocks/${stock.id}/edit`)
        .expect(200)

      expect(response.text).toContain('<title>在庫編集</title>')
      expect(response.text).toContain('版情報')
      expect(response.text).toContain('保管場所')
      expect(response.text).toContain('在庫数')
      expect(response.text).toContain('予約済み数')
      expect(response.text).toContain('販売可能数')
      expect(response.text).toContain('備考')
      expect(response.text).toContain('50') // 現在の在庫数
      expect(response.text).toContain('10') // 現在の予約済み数
      expect(response.text).toContain('40') // 現在の販売可能数
      expect(response.text).toContain('テスト在庫') // 現在の備考
    })

    it('存在しない在庫IDでアクセスすると404エラーになる', async () => {
      await request(app.getHttpServer()).get('/stocks/999999/edit').expect(404)
    })
  })
})
