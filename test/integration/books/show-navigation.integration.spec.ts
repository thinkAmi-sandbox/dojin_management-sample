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

describe('書籍詳細画面 ナビゲーション機能', () => {
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

  describe('入稿関連ボタンの表示', () => {
    it('書籍詳細画面に「入稿履歴」ボタンが存在する', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: GET /books/:id にリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 入稿履歴ボタンが存在することを確認
      expect(response.text).toContain('入稿履歴')
      expect(response.text).toContain(
        `href="/books/${testBook.id}/submissions"`,
      )
    })

    it('書籍詳細画面に「新規入稿」ボタンが存在する', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: GET /books/:id にリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 新規入稿ボタンが存在することを確認
      expect(response.text).toContain('新規入稿')
      expect(response.text).toContain(
        `href="/books/${testBook.id}/submissions/new"`,
      )
    })

    it('入稿関連ボタンが適切なスタイルで表示される', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: GET /books/:id にリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: ボタンスタイルが適切であることを確認
      // 入稿履歴ボタン（info色）
      expect(response.text).toMatch(
        /href="\/books\/\d+\/submissions"[^>]*style="[^"]*background-color:\s*#17a2b8/,
      )

      // 新規入稿ボタン（success色）
      expect(response.text).toMatch(
        /href="\/books\/\d+\/submissions\/new"[^>]*style="[^"]*background-color:\s*#28a745/,
      )
    })

    it('入稿関連ボタンが既存ボタンと適切に配置される', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: GET /books/:id にリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全てのアクションボタンが存在することを確認
      const bookActionsRegex = /<div class="book-actions"[^>]*>[\s\S]*?<\/div>/
      const bookActionsMatch = response.text.match(bookActionsRegex)

      expect(bookActionsMatch).toBeTruthy()
      const bookActionsSection = bookActionsMatch?.[0] || ''

      // 既存ボタンの存在確認
      expect(bookActionsSection).toContain('一覧に戻る')
      expect(bookActionsSection).toContain('締切一覧')
      expect(bookActionsSection).toContain('執筆者管理')

      // 新しい入稿関連ボタンの存在確認
      expect(bookActionsSection).toContain('入稿履歴')
      expect(bookActionsSection).toContain('新規入稿')

      // 既存ボタンも含めた確認
      expect(bookActionsSection).toContain('ステータス変更')
      expect(bookActionsSection).toContain('編集')
      expect(bookActionsSection).toContain('削除')
    })

    it('入稿関連ボタンのリンクが正しく動作する', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: 書籍詳細から入稿履歴へのリンクをテスト
      const submissionsResponse = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 入稿履歴ページが正しく表示される
      expect(submissionsResponse.text).toContain('入稿一覧')
      expect(submissionsResponse.text).toContain(testBook.title)

      // Act: 書籍詳細から新規入稿フォームへのリンクをテスト
      const newSubmissionResponse = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/submissions/new`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 新規入稿フォームが正しく表示される
      expect(newSubmissionResponse.text).toContain('入稿')
      expect(newSubmissionResponse.text).toContain(testBook.title)
    })
  })

  describe('ボタンの配置順序', () => {
    it('入稿関連ボタンが執筆者管理の後、ステータス変更の前に配置される', async () => {
      // Arrange: テスト用書籍を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          subtitle: 'サブタイトル',
          description: '説明文',
        })
        .returning()

      // Act: GET /books/:id にリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: ボタンの順序が期待通りであることを確認
      const bookActionsMatch = response.text.match(
        /<div class="book-actions"[^>]*>[\s\S]*?<\/div>/,
      )
      expect(bookActionsMatch).toBeTruthy()

      const bookActionsSection = bookActionsMatch?.[0] || ''

      // 順序確認：執筆者管理 → 入稿履歴 → 新規入稿 → ステータス変更
      const authorsIndex = bookActionsSection.indexOf('執筆者管理')
      const submissionsHistoryIndex = bookActionsSection.indexOf('入稿履歴')
      const newSubmissionIndex = bookActionsSection.indexOf('新規入稿')
      const statusIndex = bookActionsSection.indexOf('ステータス変更')

      expect(authorsIndex).toBeGreaterThan(-1)
      expect(submissionsHistoryIndex).toBeGreaterThan(authorsIndex)
      expect(newSubmissionIndex).toBeGreaterThan(submissionsHistoryIndex)
      expect(statusIndex).toBeGreaterThan(newSubmissionIndex)
    })
  })
})
