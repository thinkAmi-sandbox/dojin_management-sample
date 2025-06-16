import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Add Author to Book', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBookId: number
  let testAuthorId: number

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
    const authorResult = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: 'テスト執筆者',
        email: 'test-add-author-to-book@example.com',
        bio: 'テスト用執筆者の経歴',
      })
      .returning()
    testAuthorId = authorResult[0].id
  })

  describe('GET /books/:bookId/authors', () => {
    it('書籍の執筆者一覧ページが表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: HTMLの基本構造を確認
      expect(response.text).toContain('<!DOCTYPE html>')
      expect(response.text).toContain('<html')
      expect(response.text).toContain('</html>')
      expect(response.text).toMatch(/<title>.*執筆者.*<\/title>/i)
    })

    it('執筆者が関連付けられていない場合、空の一覧が表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 空の状態を示すメッセージが表示される
      expect(response.text).toMatch(/執筆者.*登録されていません|執筆者.*0.*人/i)
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999

      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${nonExistentBookId}/authors`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)
    })
  })

  describe('GET /books/:bookId/authors/add', () => {
    it('執筆者追加フォームが表示される', async () => {
      // Act: GET /books/:bookId/authors/addにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors/add`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: フォーム要素の存在を確認
      expect(response.text).toContain('<form')
      expect(response.text).toMatch(/action="\/books\/\d+\/authors"/)
      expect(response.text).toMatch(/method="post"/i)

      // セレクトボックスの存在を確認
      expect(response.text).toMatch(/name="authorId"/)
      expect(response.text).toMatch(/<select/)
    })

    it('既に関連付けられている執筆者は選択肢から除外される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthorId,
      })

      // Act: GET /books/:bookId/authors/addにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors/add`)
        .expect(200)

      // Assert: 既に関連付けられた執筆者は選択肢に含まれていない
      expect(response.text).not.toMatch(
        new RegExp(`value="${testAuthorId}".*テスト執筆者`, 'i'),
      )
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999

      // Act: GET /books/:bookId/authors/addにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${nonExistentBookId}/authors/add`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)
    })
  })

  describe('POST /books/:bookId/authors', () => {
    it('有効なauthorIdで執筆者が書籍に正常に関連付けられる', async () => {
      // Arrange: 執筆者IDを準備
      const authorData = {
        authorId: testAuthorId,
      }

      // Act: POST /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send(authorData)
        .expect(302) // リダイレクト

      // Assert: リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースに保存されていることを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(1)
      expect(savedBookAuthors[0].bookId).toBe(testBookId)
      expect(savedBookAuthors[0].authorId).toBe(testAuthorId)
    })

    it('authorIdが未入力の場合、適切なエラーが表示される', async () => {
      // Arrange: authorIdなしのデータを準備
      const authorData = {}

      // Act: POST /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send(authorData)
        .expect(400) // バッドリクエスト

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/執筆者.*選択.*必須|authorId.*required/i)

      // データベースに保存されていないことを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(0)
    })

    it('存在しないauthorIdの場合、適切なエラーが表示される', async () => {
      // Arrange: 存在しない執筆者IDを準備
      const nonExistentAuthorId = 99999
      const authorData = {
        authorId: nonExistentAuthorId,
      }

      // Act: POST /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send(authorData)
        .expect(404) // Not Found

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/執筆者.*見つかりません|author.*not found/i)

      // データベースに保存されていないことを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(0)
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999
      const authorData = {
        authorId: testAuthorId,
      }

      // Act: POST /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${nonExistentBookId}/authors`)
        .send(authorData)
        .expect(404) // Not Found

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)

      // データベースに保存されていないことを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(0)
    })

    it('既に関連付けられている執筆者を再度追加しようとした場合、適切なエラーが表示される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthorId,
      })

      const authorData = {
        authorId: testAuthorId,
      }

      // Act: POST /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send(authorData)
        .expect(400) // バッドリクエスト

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(
        /この執筆者は既にこの書籍に関連付けられています/,
      )

      // データベースに重複して保存されていないことを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(1) // 元々の1件のみ
    })

    it('フォームデータで執筆者が正常に関連付けられる', async () => {
      // Act: HTMLフォームと同じようにform-dataで送信
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .type('form')
        .send({
          authorId: testAuthorId.toString(), // 文字列として送信
        })

      console.log('Form data response status:', response.status)
      console.log('Form data response text:', response.text)

      // Assert: 成功することを確認
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースに保存されていることを確認
      const savedBookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(savedBookAuthors).toHaveLength(1)
      expect(savedBookAuthors[0].bookId).toBe(testBookId)
      expect(savedBookAuthors[0].authorId).toBe(testAuthorId)
    })
  })
})
