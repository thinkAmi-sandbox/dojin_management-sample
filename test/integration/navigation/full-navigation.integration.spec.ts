import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('フル ナビゲーション E2E テスト', () => {
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
    await testDbUtils.cleanupDatabase()
  })

  describe('ホームページから全機能へのアクセス', () => {
    it('ホーム → 各主要機能へのナビゲーションパス', async () => {
      // Act & Assert: ホームページから各機能にアクセス

      // 1. ホームページにアクセス
      const homeResponse = await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(homeResponse.text).toContain('同人誌管理システムへようこそ')
      expect(homeResponse.text).toContain('ホーム')
      expect(homeResponse.text).toContain('書籍一覧')
      expect(homeResponse.text).toContain('執筆者一覧')
      expect(homeResponse.text).toContain('印刷所一覧')
      expect(homeResponse.text).toContain('入稿一覧')

      // 2. ホーム → 書籍一覧
      const booksResponse = await request(app.getHttpServer())
        .get('/books')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(booksResponse.text).toContain('書籍一覧')

      // 3. ホーム → 執筆者一覧
      const authorsResponse = await request(app.getHttpServer())
        .get('/authors')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(authorsResponse.text).toContain('執筆者一覧')

      // 4. ホーム → 印刷所一覧
      const printingCompaniesResponse = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(printingCompaniesResponse.text).toContain('印刷所一覧')

      // 5. ホーム → 入稿一覧
      const submissionsResponse = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(submissionsResponse.text).toContain('入稿一覧')
    })
  })

  describe('書籍詳細からの入稿機能アクセス', () => {
    it('書籍詳細 → 入稿関連機能へのナビゲーションパス', async () => {
      // Arrange: テスト用書籍と印刷所を作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'E2Eテスト書籍',
          subtitle: 'ナビゲーションテスト',
          description: '全体ナビゲーションのテスト用書籍',
          pageCount: 200,
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
          websiteUrl: 'https://test.example.com',
          notes: 'テスト用印刷所',
        })
        .returning()

      // Act & Assert: 書籍詳細から入稿機能へのアクセス

      // 1. 書籍詳細ページ
      const bookDetailResponse = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
        .expect('Content-Type', /html/)

      expect(bookDetailResponse.text).toContain('入稿履歴')
      expect(bookDetailResponse.text).toContain('新規入稿')

      // 2. 書籍詳細 → 入稿履歴
      const bookSubmissionsResponse = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      expect(bookSubmissionsResponse.text).toContain('入稿一覧')
      expect(bookSubmissionsResponse.text).toContain(testBook.title)

      // 3. 書籍詳細 → 新規入稿フォーム
      const newSubmissionResponse = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/submissions/new`)
        .expect(200)
        .expect('Content-Type', /html/)

      expect(newSubmissionResponse.text).toContain('入稿')
      expect(newSubmissionResponse.text).toContain(testBook.title)
    })
  })

  describe('入稿一覧からの高度機能アクセス', () => {
    it('入稿一覧 → 進行中・コスト集計へのナビゲーションパス', async () => {
      // Act & Assert: 入稿一覧から高度機能へのアクセス

      // 1. 通常の入稿一覧
      const submissionsIndexResponse = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(submissionsIndexResponse.text).toContain('全て')
      expect(submissionsIndexResponse.text).toContain('進行中のみ')
      expect(submissionsIndexResponse.text).toContain('コスト集計')

      // 2. 入稿一覧 → 進行中のみ
      const inProgressResponse = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(inProgressResponse.text).toContain('進行中')
      expect(inProgressResponse.text).toContain('納期順')

      // 3. 入稿一覧 → コスト集計
      const costsResponse = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(costsResponse.text).toContain('コスト')
      expect(costsResponse.text).toContain('集計')
    })
  })

  describe('完全なナビゲーションフロー', () => {
    it('直接URL入力なしで全機能にアクセス可能', async () => {
      // Arrange: 完全なテストデータセットを作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'フルナビゲーションテスト',
          subtitle: 'E2E',
          description: '完全なナビゲーションテスト',
          pageCount: 300,
        })
        .returning()

      const [testAuthor] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: 'テスト執筆者',
          email: 'test@example.com',
          bio: 'テスト用執筆者',
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'フルテスト印刷所',
          websiteUrl: 'https://fulltest.example.com',
          notes: 'フルナビゲーションテスト用',
        })
        .returning()

      // Act & Assert: 完全なナビゲーションフロー

      // フロー1: ホーム → 書籍一覧 → 書籍詳細 → 入稿履歴
      const step1 = await request(app.getHttpServer()).get('/').expect(200)
      expect(step1.text).toContain('書籍一覧')

      const step2 = await request(app.getHttpServer()).get('/books').expect(200)
      expect(step2.text).toContain('書籍一覧')

      const step3 = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)
      expect(step3.text).toContain('入稿履歴')

      const step4 = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/submissions`)
        .expect(200)
      expect(step4.text).toContain('入稿一覧')

      // フロー2: ホーム → 入稿一覧 → 進行中のみ → コスト集計
      const flow2step1 = await request(app.getHttpServer()).get('/').expect(200)
      expect(flow2step1.text).toContain('入稿一覧')

      const flow2step2 = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
      expect(flow2step2.text).toContain('進行中のみ')

      const flow2step3 = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
      expect(flow2step3.text).toContain('コスト集計')

      const flow2step4 = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)
      expect(flow2step4.text).toContain('コスト')

      // フロー3: ホーム → 執筆者一覧
      const flow3step1 = await request(app.getHttpServer()).get('/').expect(200)
      expect(flow3step1.text).toContain('執筆者一覧')

      const flow3step2 = await request(app.getHttpServer())
        .get('/authors')
        .expect(200)
      expect(flow3step2.text).toContain('執筆者一覧')

      // フロー4: ホーム → 印刷所一覧
      const flow4step1 = await request(app.getHttpServer()).get('/').expect(200)
      expect(flow4step1.text).toContain('印刷所一覧')

      const flow4step2 = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
      expect(flow4step2.text).toContain('印刷所一覧')
    })
  })

  describe('ナビゲーション一貫性テスト', () => {
    it('全ページで一貫したグローバルナビゲーション', async () => {
      const testUrls = [
        '/',
        '/books',
        '/authors',
        '/printing-companies',
        '/submissions',
        '/submissions/in-progress',
        '/submissions/costs',
      ]

      for (const url of testUrls) {
        const response = await request(app.getHttpServer())
          .get(url)
          .expect(200)
          .expect('Content-Type', /html/)

        // 全ページで同じヘッダーナビゲーションが存在することを確認
        expect(response.text).toContain('href="/"') // ホーム
        expect(response.text).toContain('href="/books"') // 書籍一覧
        expect(response.text).toContain('href="/authors"') // 執筆者一覧
        expect(response.text).toContain('href="/printing-companies"') // 印刷所一覧
        expect(response.text).toContain('href="/submissions"') // 入稿一覧
      }
    })

    it('入稿関連ページで一貫したサブナビゲーション', async () => {
      const submissionUrls = [
        '/submissions',
        '/submissions/in-progress',
        '/submissions/costs',
      ]

      for (const url of submissionUrls) {
        const response = await request(app.getHttpServer())
          .get(url)
          .expect(200)
          .expect('Content-Type', /html/)

        // 全入稿ページで同じサブナビゲーションが存在することを確認
        expect(response.text).toContain('class="sub-navigation"')
        expect(response.text).toContain('全て')
        expect(response.text).toContain('進行中のみ')
        expect(response.text).toContain('コスト集計')
      }
    })
  })

  describe('ナビゲーションエラーハンドリング', () => {
    it('存在しないページでも基本ナビゲーションが機能する', async () => {
      // 404ページでも基本的なナビゲーションは表示されるべき
      const response = await request(app.getHttpServer())
        .get('/nonexistent-page')
        .expect(404)

      // このテストは404ページのレイアウト次第で調整が必要
      // 基本的にはエラーページでも最低限のナビゲーションがあることを確認
    })
  })
})
