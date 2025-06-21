import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Book Authors Management (Integration)', () => {
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
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ
    await testDbUtils.cleanupDatabase()

    // 各テストで必要なテストデータを作成（ユニークなデータ）
    const timestamp = Date.now()

    // テスト用の書籍を作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: `テスト書籍_${timestamp}`,
        subtitle: `テスト用サブタイトル_${timestamp}`,
        description: `テスト用の説明_${timestamp}`,
        pageCount: 100,
      })
      .returning()
    testBookId = bookResult[0].id

    // テスト用の執筆者を作成
    const authorsResult = await drizzleService.db
      .insert(schema.authors)
      .values([
        {
          name: `テスト執筆者1_${timestamp}`,
          email: `manage-test-author1-${timestamp}@example.com`,
          bio: `テスト用執筆者1のプロフィール_${timestamp}`,
        },
        {
          name: `テスト執筆者2_${timestamp}`,
          email: `manage-test-author2-${timestamp}@example.com`,
          bio: `テスト用執筆者2のプロフィール_${timestamp}`,
        },
      ])
      .returning()
    testAuthor1Id = authorsResult[0].id
    testAuthor2Id = authorsResult[1].id
  })

  afterEach(async () => {
    // 各テスト後に全データをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:bookId/authors', () => {
    it('書籍に関連する執筆者一覧を表示すること', async () => {
      // テストデータの準備: 書籍に執筆者を関連付け
      await drizzleService.db.insert(schema.bookAuthors).values([
        { bookId: testBookId, authorId: testAuthor1Id },
        { bookId: testBookId, authorId: testAuthor2Id },
      ])

      // 一覧ページにアクセス
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // レスポンスにテスト執筆者が含まれることを確認
      expect(response.text).toContain('テスト執筆者1')
      expect(response.text).toContain('テスト執筆者2')
      expect(response.text).toContain('テスト書籍')
    })

    it('書籍に執筆者が関連していない場合の表示を確認すること', async () => {
      // 執筆者が関連していない状態でアクセス
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // 「執筆者が登録されていません」のようなメッセージが表示されることを確認
      expect(response.text).toMatch(
        /執筆者.*登録.*いません|執筆者.*見つかりません/i,
      )
    })

    it('存在しない書籍IDの場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/books/999999/authors')
        .expect(404)
    })

    it('不正なbookIDの場合は400エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/books/invalid-id/authors')
        .expect(400) // ParseIntPipeが400エラーを返す
    })
  })

  describe('GET /books/:bookId/authors/add', () => {
    it('執筆者追加フォームを表示すること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors/add`)
        .expect(200)

      // フォームとselect要素が含まれることを確認
      expect(response.text).toContain('<form')
      expect(response.text).toContain('<select')
      expect(response.text).toContain('テスト執筆者1')
      expect(response.text).toContain('テスト執筆者2')
    })

    it('既に関連している執筆者は選択肢から除外されること', async () => {
      // 執筆者1を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors/add`)
        .expect(200)

      // 執筆者1は表示されず、執筆者2のみ表示されることを確認
      expect(response.text).not.toContain('テスト執筆者1')
      expect(response.text).toContain('テスト執筆者2')
    })

    it('存在しない書籍IDの場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/books/999999/authors/add')
        .expect(404)
    })
  })

  describe('POST /books/:bookId/authors', () => {
    it('有効な執筆者IDで関連を追加すること', async () => {
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send({ authorId: testAuthor1Id.toString() })
        .expect(302) // リダイレクト

      // リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースに関連が追加されていることを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(bookAuthors).toHaveLength(1)
      expect(bookAuthors[0].bookId).toBe(testBookId)
      expect(bookAuthors[0].authorId).toBe(testAuthor1Id)
    })

    it('既に関連している執筆者の重複追加を防ぐこと', async () => {
      // 先に関連を追加
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // 同じ関連を再度追加しようとする
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send({ authorId: testAuthor1Id.toString() })
        .expect(400) // サービス層からのBadRequestExceptionは400エラー

      // エラーメッセージが含まれることを確認（JSON形式で返される）
      expect(response.body.message).toContain(
        'この執筆者は既にこの書籍に関連付けられています',
      )
    })

    it('存在しない執筆者IDでエラーを返すこと', async () => {
      await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send({ authorId: '999999' })
        .expect(404)
    })

    it('存在しない書籍IDでエラーを返すこと', async () => {
      await request(app.getHttpServer())
        .post('/books/999999/authors')
        .send({ authorId: testAuthor1Id.toString() })
        .expect(404)
    })

    it('authorIdが未指定の場合はバリデーションエラーを返すこと', async () => {
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send({})
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      expect(response.text).toContain('執筆者の選択は必須です')
    })

    it('無効なauthorIdの場合はバリデーションエラーを返すこと', async () => {
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors`)
        .send({ authorId: 'invalid-id' })
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // このケースでは無効な文字列が送信されるため、どちらかのエラーメッセージが表示される
      const hasIntegerError = response.text.includes(
        '執筆者IDは整数である必要があります',
      )
      const hasPositiveError = response.text.includes(
        '執筆者IDは正の数である必要があります',
      )
      expect(hasIntegerError || hasPositiveError).toBe(true)
    })
  })

  describe('DELETE /books/:bookId/authors/:authorId', () => {
    it('書籍と執筆者の関連を削除すること', async () => {
      // 先に関連を追加
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // 削除リクエスト
      const response = await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .expect(302) // リダイレクト

      // リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースから関連が削除されていることを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(bookAuthors).toHaveLength(0)
    })

    it('HTTPメソッドオーバーライドで削除すること', async () => {
      // 先に関連を追加
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // POSTメソッド + _method=DELETE で削除
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .send({ _method: 'DELETE' })
        .expect(302)

      // リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/authors`)

      // データベースから関連が削除されていることを確認
      const bookAuthors = await drizzleService.db
        .select()
        .from(schema.bookAuthors)
      expect(bookAuthors).toHaveLength(0)
    })

    it('存在しない関連の場合は404エラーを返すこと', async () => {
      // 関連が存在しない状態で削除を試行
      await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/${testAuthor1Id}`)
        .expect(404)
    })

    it('存在しない書籍IDの場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .delete(`/books/999999/authors/${testAuthor1Id}`)
        .expect(404)
    })

    it('存在しない執筆者IDの場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .delete(`/books/${testBookId}/authors/999999`)
        .expect(404)
    })
  })
})
