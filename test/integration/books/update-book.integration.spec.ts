import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Books Update (Integration)', () => {
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

  afterEach(async () => {
    // testDbUtilsを使用して全テーブルをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:id/edit', () => {
    it('既存の書籍の編集フォームを表示すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          subtitle: 'テストサブタイトル',
          description: 'テスト説明',
          pageCount: 100,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/edit`)
        .expect(200)

      expect(response.text).toContain('書籍編集')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain(testBook.subtitle)
      expect(response.text).toContain(testBook.description)
      expect(response.text).toContain(`value="${testBook.pageCount}"`)
      expect(response.text).toContain('name="_method" value="PUT"')
    })

    it('存在しない書籍の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer()).get('/books/999999/edit').expect(404)
    })
  })

  describe('PUT /books/:id', () => {
    it('書籍情報を正常に更新すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: '更新前タイトル',
          subtitle: '更新前サブタイトル',
          description: '更新前説明',
          pageCount: 50,
        })
        .returning()

      const updateData = {
        title: '更新後タイトル',
        subtitle: '更新後サブタイトル',
        description: '更新後説明',
        pageCount: '150',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post(`/books/${testBook.id}`)
        .send(updateData)
        .expect(302)
        .expect('Location', `/books/${testBook.id}`)

      // 更新されたデータを確認
      const [updatedBook] = await drizzleService.db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id))

      expect(updatedBook.title).toBe('更新後タイトル')
      expect(updatedBook.subtitle).toBe('更新後サブタイトル')
      expect(updatedBook.description).toBe('更新後説明')
      expect(updatedBook.pageCount).toBe(150)
    })

    it('必須フィールドが空の場合はバリデーションエラーとなること', async () => {
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
        })
        .returning()

      const updateData = {
        title: '',
        _method: 'PUT',
      }

      const response = await request(app.getHttpServer())
        .post(`/books/${testBook.id}`)
        .send(updateData)
        .expect(200)

      expect(response.text).toContain('タイトルは必須です')
      expect(response.text).toContain('書籍編集')
    })

    it('存在しない書籍の更新は404エラーを返すこと', async () => {
      const updateData = {
        title: '更新タイトル',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post('/books/999999')
        .send(updateData)
        .expect(404)
    })
  })
})
