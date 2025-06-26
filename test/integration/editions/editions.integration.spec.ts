import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Editions（版管理）統合テスト', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()

    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ（統一済みパターン）
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:bookId/editions - 書籍の版一覧', () => {
    it('書籍に関連する版の一覧を表示する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      // テスト用版データを作成
      await drizzleService.db.insert(testDbUtils.schema.editions).values([
        {
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          isActive: true,
        },
        {
          bookId: book.id,
          versionName: '第2版',
          versionNumber: 2,
          basePrice: 1200,
          isActive: false,
        },
      ])

      const response = await request(app.getHttpServer())
        .get(`/books/${book.id}/editions`)
        .expect(200)

      // 版一覧画面が表示されることを確認
      expect(response.text).toContain('版一覧')
      expect(response.text).toContain('テスト書籍')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('第2版')
      expect(response.text).toContain('1,000円')
      expect(response.text).toContain('1,200円')
    })
  })

  describe('POST /books/:bookId/editions - 新版作成', () => {
    it('有効なデータで新版を作成する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .post(`/books/${book.id}/editions`)
        .send({
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1500,
          pageCount: 100,
          publishDate: '2024-01-01',
          editionNotes: '初回版です',
          isActive: true,
        })
        .expect(302) // リダイレクト

      // リダイレクト先が版一覧であることを確認
      expect(response.headers.location).toBe(`/books/${book.id}/editions`)

      // データベースに版が作成されていることを確認
      const editions = await drizzleService.db
        .select()
        .from(testDbUtils.schema.editions)
      expect(editions).toHaveLength(1)
      expect(editions[0].versionName).toBe('初版')
      expect(editions[0].basePrice).toBe(1500)
      expect(editions[0].bookId).toBe(book.id)
    })
  })

  describe('GET /editions/:id - 版詳細', () => {
    it('版の詳細情報を表示する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      // テスト用版データを作成
      const [edition] = await drizzleService.db
        .insert(testDbUtils.schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          pageCount: 80,
          publishDate: '2024-01-01',
          editionNotes: '初回発行版です',
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/editions/${edition.id}`)
        .expect(200)

      // 版詳細画面が表示されることを確認
      expect(response.text).toContain('テスト書籍 - 初版')
      expect(response.text).toContain('テスト書籍')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('1,000円')
      expect(response.text).toContain('80')
      expect(response.text).toContain('初回発行版です')
    })
  })

  describe('GET /editions/:id/edit - 版編集フォーム', () => {
    it('版の編集フォームを表示する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      // テスト用版データを作成
      const [edition] = await drizzleService.db
        .insert(testDbUtils.schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          pageCount: 80,
          publishDate: '2024-01-01',
          editionNotes: '初回発行版です',
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/editions/${edition.id}/edit`)
        .expect(200)

      // 版編集フォームが表示されることを確認
      expect(response.text).toContain('編集')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('value="1000"')
      expect(response.text).toContain('value="80"')
      expect(response.text).toContain('初回発行版です')
    })
  })

  describe('PUT /editions/:id - 版更新', () => {
    it('有効なデータで版を更新する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      // テスト用版データを作成
      const [edition] = await drizzleService.db
        .insert(testDbUtils.schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          pageCount: 80,
          publishDate: '2024-01-01',
          editionNotes: '初回発行版です',
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .put(`/editions/${edition.id}`)
        .send({
          versionName: '改訂版',
          versionNumber: 1,
          basePrice: 1200,
          pageCount: 90,
          publishDate: '2024-02-01',
          editionNotes: '改訂された版です',
          isActive: true,
        })
        .expect(302) // リダイレクト

      // リダイレクト先が版詳細であることを確認
      expect(response.headers.location).toBe(`/editions/${edition.id}`)

      // データベースで更新されていることを確認
      const updatedEditions = await drizzleService.db
        .select()
        .from(testDbUtils.schema.editions)
        .where(eq(testDbUtils.schema.editions.id, edition.id))
      expect(updatedEditions).toHaveLength(1)
      expect(updatedEditions[0].versionName).toBe('改訂版')
      expect(updatedEditions[0].basePrice).toBe(1200)
      expect(updatedEditions[0].pageCount).toBe(90)
    })
  })

  describe('DELETE /editions/:id - 版削除', () => {
    it('版を削除する', async () => {
      // テスト用書籍データを作成
      const [book] = await drizzleService.db
        .insert(testDbUtils.schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          status: 'completed',
        })
        .returning()

      // テスト用版データを作成
      const [edition] = await drizzleService.db
        .insert(testDbUtils.schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          pageCount: 80,
          publishDate: '2024-01-01',
          editionNotes: '初回発行版です',
          isActive: true,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .delete(`/editions/${edition.id}`)
        .expect(302) // リダイレクト

      // リダイレクト先が書籍の版一覧であることを確認
      expect(response.headers.location).toBe(`/books/${book.id}/editions`)

      // データベースから削除されていることを確認
      const deletedEditions = await drizzleService.db
        .select()
        .from(testDbUtils.schema.editions)
        .where(eq(testDbUtils.schema.editions.id, edition.id))
      expect(deletedEditions).toHaveLength(0)
    })
  })
})
