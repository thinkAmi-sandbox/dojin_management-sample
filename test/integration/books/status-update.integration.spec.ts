import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Books Status Update (Integration)', () => {
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
    // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:bookId/status/edit', () => {
    it('既存の書籍のステータス変更フォームを表示すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          subtitle: 'テストサブタイトル',
          description: 'テスト説明',
          pageCount: 100,
          status: 'writing',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/status/edit`)
        .expect(200)

      expect(response.text).toContain('ステータス変更')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('value="writing" selected')
      expect(response.text).toContain('name="_method" value="PUT"')
      expect(response.text).toContain('<option value="planning"')
      expect(response.text).toContain('<option value="writing"')
      expect(response.text).toContain('<option value="editing"')
      expect(response.text).toContain('<option value="completed"')
    })

    it('存在しない書籍の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/books/999999/status/edit')
        .expect(404)
    })
  })

  describe('PUT /books/:bookId/status', () => {
    it('書籍のステータスを正常に更新すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          status: 'planning',
        })
        .returning()

      const updateData = {
        status: 'writing',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post(`/books/${testBook.id}/status`)
        .send(updateData)
        .expect(302)
        .expect('Location', `/books/${testBook.id}`)

      // 更新されたデータを確認
      const [updatedBook] = await drizzleService.db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id))

      expect(updatedBook.status).toBe('writing')
    })

    it('無効なステータス値の場合はバリデーションエラーとなること', async () => {
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          status: 'planning',
        })
        .returning()

      const updateData = {
        status: 'invalid_status',
        _method: 'PUT',
      }

      const response = await request(app.getHttpServer())
        .post(`/books/${testBook.id}/status`)
        .send(updateData)
        .expect(200)

      expect(response.text).toContain('有効なステータスを選択してください')
      expect(response.text).toContain('ステータス変更')

      // データが更新されていないことを確認
      const [unchangedBook] = await drizzleService.db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id))

      expect(unchangedBook.status).toBe('planning')
    })

    it('ステータス値が未指定の場合はバリデーションエラーとなること', async () => {
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          status: 'planning',
        })
        .returning()

      const updateData = {
        _method: 'PUT',
      }

      const response = await request(app.getHttpServer())
        .post(`/books/${testBook.id}/status`)
        .send(updateData)
        .expect(200)

      expect(response.text).toContain('ステータスは必須です')
      expect(response.text).toContain('ステータス変更')
    })

    it('存在しない書籍のステータス更新は404エラーを返すこと', async () => {
      const updateData = {
        status: 'writing',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post('/books/999999/status')
        .send(updateData)
        .expect(404)
    })
  })
})
