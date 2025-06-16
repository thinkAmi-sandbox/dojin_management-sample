import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('DELETE /authors/:id', () => {
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
    await drizzleService.db.delete(schema.bookAuthors)
    await drizzleService.db.delete(schema.authors)
    await drizzleService.db.delete(schema.books)
  })

  describe('DELETE /authors/:id (via POST with _method=DELETE)', () => {
    it('存在する執筆者を削除し、一覧ページにリダイレクトする', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '削除対象執筆者',
          email: 'delete@example.com',
          bio: '削除されるプロフィール',
        })
        .returning()

      // Act: POST /authors/:id with _method=DELETEにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/authors/${author.id}`)
        .send({ _method: 'DELETE' })
        .expect(302)

      // Assert: リダイレクト先が正しいことを確認
      expect(response.headers.location).toBe('/authors')

      // データベースから削除されていることを確認
      const authors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(authors).toHaveLength(0)
    })

    it('書籍との関連がある執筆者を削除すると、関連も削除される（カスケード削除）', async () => {
      // Arrange: 書籍と執筆者、その関連を作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'テスト副題',
          description: 'テスト説明',
          pageCount: 100,
        })
        .returning()

      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '関連執筆者',
          email: 'related@example.com',
          bio: '関連プロフィール',
        })
        .returning()

      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: book.id,
        authorId: author.id,
      })

      // Act: POST /authors/:id with _method=DELETEにリクエスト
      await request(app.getHttpServer())
        .post(`/authors/${author.id}`)
        .send({ _method: 'DELETE' })
        .expect(302)

      // Assert: 執筆者が削除されていることを確認
      const authors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(authors).toHaveLength(0)

      // 関連データも削除されていることを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
        .where(eq(schema.bookAuthors.authorId, author.id))
      expect(bookAuthors).toHaveLength(0)

      // 書籍は削除されていないことを確認
      const books = await drizzleService.db
        .select()
        .from(schema.books)
        .where(eq(schema.books.id, book.id))
      expect(books).toHaveLength(1)
    })

    it('存在しない執筆者IDの場合、404エラーを返す', async () => {
      // Act: 存在しない執筆者IDでリクエスト
      await request(app.getHttpServer())
        .post('/authors/999')
        .send({ _method: 'DELETE' })
        .expect(404)
    })

    it('無効な執筆者IDの場合、400エラーを返す', async () => {
      // Act: 無効なIDでリクエスト
      await request(app.getHttpServer())
        .post('/authors/invalid')
        .send({ _method: 'DELETE' })
        .expect(400)
    })
  })

  describe('Direct DELETE /authors/:id', () => {
    it('直接DELETEメソッドでも執筆者を削除できる', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '直接削除対象',
          email: 'direct-delete@example.com',
          bio: '直接削除プロフィール',
        })
        .returning()

      // Act: DELETE /authors/:idにリクエスト
      const response = await request(app.getHttpServer())
        .delete(`/authors/${author.id}`)
        .expect(302)

      // Assert: リダイレクト先が正しいことを確認
      expect(response.headers.location).toBe('/authors')

      // データベースから削除されていることを確認
      const authors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(authors).toHaveLength(0)
    })
  })
})
