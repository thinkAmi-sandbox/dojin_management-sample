import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Deadlines New Form', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBookId: number

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
    await app.init()

    // テスト用の書籍を事前に作成
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
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  afterEach(async () => {
    // NestJSアプリ内のDrizzleServiceを使ってクリーンアップ
    await drizzleService.db.delete(schema.deadlines)
  })

  describe('GET /books/:bookId/deadlines/new', () => {
    it('締切追加フォームが正常に表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: HTMLの基本構造を確認
      expect(response.text).toContain('<!DOCTYPE html>')
      expect(response.text).toContain('<html')
      expect(response.text).toContain('</html>')
      expect(response.text).toMatch(/<title>.*締切.*追加.*<\/title>/i)
    })

    it('必要なフォーム要素が含まれている', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: フォーム要素の存在を確認
      expect(response.text).toContain('<form')
      expect(response.text).toMatch(
        new RegExp(`action="/books/${testBookId}/deadlines"`),
      )
      expect(response.text).toMatch(/method="post"/i)

      // 各入力フィールドの存在を確認
      expect(response.text).toMatch(/name="title"/)
      expect(response.text).toMatch(/name="dueDate"/)
      expect(response.text).toMatch(/name="description"/)

      // 送信ボタンの存在を確認
      expect(response.text).toMatch(/type="submit"/)
    })

    it('タイトルフィールドが必須項目として表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: タイトルフィールドが必須として表示される
      expect(response.text).toMatch(/name="title"[\s\S]*?required/i)
      expect(response.text).toMatch(/タイトル.*\*/)
    })

    it('締切日フィールドが必須項目として表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: 締切日フィールドが必須として表示される
      expect(response.text).toMatch(/name="dueDate"[\s\S]*?required/i)
      expect(response.text).toMatch(/締切日.*\*/)
    })

    it('説明フィールドがオプショナルとして表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: 説明フィールドにrequiredがついていない
      expect(response.text).toMatch(/name="description"/)
      expect(response.text).not.toMatch(/name="description"[\s\S]*?required/i)
    })

    it('パンくずリストが正常に表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: パンくずリストが含まれている
      expect(response.text).toMatch(/書籍一覧/)
      expect(response.text).toMatch(/テスト書籍/)
      expect(response.text).toMatch(/締切一覧/)
      expect(response.text).toMatch(/締切追加/)
    })

    it('キャンセルボタンが正しいリンクで表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: キャンセルボタンが締切一覧へのリンクになっている
      expect(response.text).toMatch(
        new RegExp(`href="/books/${testBookId}/deadlines"`),
      )
      expect(response.text).toMatch(/キャンセル/)
    })

    it('書籍情報が正しく表示される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: 書籍タイトルが表示されている
      expect(response.text).toContain('テスト書籍')
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999

      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${nonExistentBookId}/deadlines/new`)
        .expect(404)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)
    })

    it('入力値とエラー情報が空で初期化される', async () => {
      // Act: GET /books/:bookId/deadlines/newにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/deadlines/new`)
        .expect(200)

      // Assert: 入力フィールドが空で初期化されている
      expect(response.text).toMatch(
        /value=""\s*name="title"|name="title"\s*value=""/,
      )
      expect(response.text).toMatch(
        /value=""\s*name="dueDate"|name="dueDate"\s*value=""/,
      )

      // エラーメッセージが表示されていない
      expect(response.text).not.toMatch(/エラー|error/i)
    })
  })
})
