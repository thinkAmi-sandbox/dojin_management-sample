import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Remove Author from Book', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBookId: number
  let testAuthor1Id: number
  let testAuthor2Id: number

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
    await app.init()

    // テストデータを完全にクリアしてから開始
    await drizzleService.db.delete(schema.bookAuthors)
    await drizzleService.db.delete(schema.books)
    await drizzleService.db.delete(schema.authors)
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    // 各テスト前にクリーンアップ
    await drizzleService.db.delete(schema.bookAuthors)
    await drizzleService.db.delete(schema.books)
    await drizzleService.db.delete(schema.authors)

    // テスト用の書籍を作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
        subtitle: 'テスト用サブタイトル',
        description: 'テスト用の説明',
        pageCount: 100,
      })
      .returning()
    testBookId = bookResult[0].id

    // テスト用の執筆者を作成（ユニークなメール）
    const author1Result = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: 'テスト執筆者1',
        email: 'test1-remove@example.com',
        bio: 'テスト用執筆者1の経歴',
      })
      .returning()
    testAuthor1Id = author1Result[0].id

    const author2Result = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: 'テスト執筆者2',
        email: 'test2-remove@example.com',
        bio: 'テスト用執筆者2の経歴',
      })
      .returning()
    testAuthor2Id = author2Result[0].id
  })

  describe('DELETE /books/:bookId/authors/:authorId', () => {
    it('有効なauthorIdで執筆者が書籍から正常に削除される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // 削除前にデータが存在することを確認
      const beforeDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(beforeDelete).toHaveLength(1)

      // Act: DELETE /books/:bookId/authors/:authorIdにリクエスト
      const response = await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .expect(302) // リダイレクト

      // Assert: リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースから削除されていることを確認
      const afterDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(afterDelete).toHaveLength(0)
    })

    it('POST（_method=DELETE）で執筆者が書籍から正常に削除される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // Act: POST with _method=DELETE
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .send({ _method: 'DELETE' })
        .expect(302)

      // Assert: リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースから削除されていることを確認
      const afterDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(afterDelete).toHaveLength(0)
    })

    it('フォームデータ（_method=DELETE）で執筆者が正常に削除される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // Act: HTMLフォームと同じようにform-dataで送信
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .type('form')
        .send({
          _method: 'DELETE',
        })

      console.log('Form data response status:', response.status)
      console.log('Form data response text:', response.text)

      // Assert: 成功することを確認
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースから削除されていることを確認
      const afterDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(afterDelete).toHaveLength(0)
    })

    it('複数の執筆者がいる場合、指定した執筆者のみが削除される', async () => {
      // Arrange: 複数の執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values([
        {
          bookId: testBookId,
          authorId: testAuthor1Id,
        },
        {
          bookId: testBookId,
          authorId: testAuthor2Id,
        },
      ])

      // 削除前に2件存在することを確認
      const beforeDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(beforeDelete).toHaveLength(2)

      // Act: author1のみを削除
      const response = await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .expect(302)

      // Assert: author2のみが残っていることを確認
      const afterDelete = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(afterDelete).toHaveLength(1)
      expect(afterDelete[0].authorId).toBe(testAuthor2Id)
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999

      // Act: DELETE /books/:bookId/authors/:authorIdにリクエスト
      const response = await request(app.getHttpServer())
        .delete(`/books/${nonExistentBookId}/authors/${testAuthor1Id}`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)
    })

    it('存在しない執筆者IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない執筆者IDを準備
      const nonExistentAuthorId = 99999

      // Act: DELETE /books/:bookId/authors/:authorIdにリクエスト
      const response = await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${nonExistentAuthorId}`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/執筆者.*見つかりません|author.*not found/i)
    })

    it('関連付けられていない執筆者を削除しようとした場合、404エラーが発生する', async () => {
      // Arrange: 執筆者は存在するが書籍との関連付けはない状態

      // Act: DELETE /books/:bookId/authors/:authorIdにリクエスト
      const response = await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(
        /関連付け.*見つかりません|association.*not found/i,
      )

      // データベースに変更がないことを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(bookAuthors).toHaveLength(0)
    })

    it('無効なHTTPメソッドでアクセスした場合、404エラーが発生する', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // Act: 無効な_methodでPOST
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .send({ _method: 'PUT' }) // DELETEではない
        .expect(404)

      // Assert: データベースに変更がないことを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(bookAuthors).toHaveLength(1) // 削除されていない
    })
  })
})
