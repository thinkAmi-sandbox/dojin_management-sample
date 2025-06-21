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

describe('Deadlines Creation', () => {
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
  })

  afterEach(async () => {
    // 各テスト後に全データをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('POST /books/:bookId/deadlines', () => {
    it('有効なデータで締切が正常に作成される', async () => {
      // Arrange: 締切データを準備
      const deadlineData = {
        title: '原稿締切',
        dueDate: '2024-12-31T23:59:59.000Z',
        description: '初稿の提出締切です',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(302) // リダイレクト

      // Assert: リダイレクト先を確認
      expect(response.headers.location).toBe(`/books/${testBookId}/deadlines`)

      // データベースに保存されていることを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(1)
      expect(savedDeadlines[0].title).toBe(deadlineData.title)
      expect(savedDeadlines[0].dueDate.toISOString()).toBe(deadlineData.dueDate)
      expect(savedDeadlines[0].description).toBe(deadlineData.description)
      expect(savedDeadlines[0].bookId).toBe(testBookId)
    })

    it('最小限のデータで締切が作成される（descriptionはオプショナル）', async () => {
      // Arrange: 最小限のデータを準備
      const deadlineData = {
        title: '校正締切',
        dueDate: '2024-11-30T23:59:59.000Z',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(302)

      // Assert: データベースに保存されていることを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(1)
      expect(savedDeadlines[0].title).toBe(deadlineData.title)
      expect(savedDeadlines[0].dueDate.toISOString()).toBe(deadlineData.dueDate)
      expect(savedDeadlines[0].description).toBeNull()
      expect(savedDeadlines[0].bookId).toBe(testBookId)
    })

    it('タイトルが未入力の場合、適切なエラーが表示される', async () => {
      // Arrange: タイトルなしのデータを準備
      const deadlineData = {
        dueDate: '2024-12-31T23:59:59.000Z',
        description: '説明のみ',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/タイトル.*必須|title.*required/i)

      // データベースに保存されていないことを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(0)
    })

    it('締切日が未入力の場合、適切なエラーが表示される', async () => {
      // Arrange: 締切日なしのデータを準備
      const deadlineData = {
        title: '締切タイトル',
        description: '説明のみ',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/) // バッドリクエスト

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/締切日.*必須|dueDate.*required/i)

      // データベースに保存されていないことを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(0)
    })

    it('タイトルが長すぎる場合、適切なバリデーションエラーが発生する', async () => {
      // Arrange: 長すぎるタイトルのデータを準備（255文字超）
      const longTitle = 'a'.repeat(256)
      const deadlineData = {
        title: longTitle,
        dueDate: '2024-12-31T23:59:59.000Z',
        description: '正常な説明',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // Assert: バリデーションエラーメッセージを確認
      expect(response.text).toMatch(
        /タイトルは255文字以下である必要があります|title.*too long/i,
      )

      // データベースに保存されていないことを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(0)
    })

    it('存在しない書籍IDの場合、404エラーが発生する', async () => {
      // Arrange: 存在しない書籍IDを準備
      const nonExistentBookId = 99999
      const deadlineData = {
        title: '正常なタイトル',
        dueDate: '2024-12-31T23:59:59.000Z',
        description: '正常な説明',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${nonExistentBookId}/deadlines`)
        .send(deadlineData)
        .expect(404) // Not Found

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/書籍.*見つかりません|book.*not found/i)

      // データベースに保存されていないことを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(0)
    })

    it('無効な日付形式の場合、適切なバリデーションエラーが発生する', async () => {
      // Arrange: 無効な日付形式のデータを準備
      const deadlineData = {
        title: '正常なタイトル',
        dueDate: 'invalid-date',
        description: '正常な説明',
      }

      // Act: POST /books/:bookId/deadlinesにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .send(deadlineData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // Assert: バリデーションエラーメッセージを確認
      expect(response.text).toMatch(/締切日.*有効な日付|dueDate.*valid date/i)

      // データベースに保存されていないことを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(0)
    })

    it('フォームデータで締切が正常に作成される', async () => {
      // Act: HTMLフォームと同じようにform-dataで送信
      const response = await request(app.getHttpServer())
        .post(`/books/${testBookId}/deadlines`)
        .type('form')
        .send({
          title: '印刷入稿締切',
          dueDate: '2024-12-25T12:00:00.000Z',
          description: '印刷所への入稿締切',
        })

      console.log('Form data response status:', response.status)
      console.log('Form data response text:', response.text)

      // Assert: 成功することを確認
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe(`/books/${testBookId}/deadlines`)

      // データベースに保存されていることを確認
      const savedDeadlines = await drizzleService.db
        .select()
        .from(schema.deadlines)
      expect(savedDeadlines).toHaveLength(1)
      expect(savedDeadlines[0].title).toBe('印刷入稿締切')
      expect(savedDeadlines[0].description).toBe('印刷所への入稿締切')
    })
  })
})
