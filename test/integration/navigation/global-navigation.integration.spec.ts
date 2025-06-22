import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('グローバルナビゲーション', () => {
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

  describe('書籍一覧ページ', () => {
    it('ヘッダーに全ての主要ナビゲーションリンクが存在する', async () => {
      // Act: GET /booksにリクエスト
      const response = await request(app.getHttpServer())
        .get('/books')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全ての主要ナビゲーションリンクが存在することを確認
      expect(response.text).toContain('<a href="/"') // ホーム
      expect(response.text).toContain('<a href="/books"') // 書籍一覧
      expect(response.text).toContain('<a href="/authors"') // 執筆者一覧
      expect(response.text).toContain('<a href="/printing-companies"') // 印刷所一覧
      expect(response.text).toContain('<a href="/submissions"') // 入稿一覧

      // リンクテキストも確認
      expect(response.text).toContain('ホーム')
      expect(response.text).toContain('書籍一覧')
      expect(response.text).toContain('執筆者一覧')
      expect(response.text).toContain('印刷所一覧')
      expect(response.text).toContain('入稿一覧')
    })
  })

  describe('執筆者一覧ページ', () => {
    it('ヘッダーに全ての主要ナビゲーションリンクが存在する', async () => {
      // Act: GET /authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get('/authors')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全ての主要ナビゲーションリンクが存在することを確認
      expect(response.text).toContain('<a href="/"')
      expect(response.text).toContain('<a href="/books"')
      expect(response.text).toContain('<a href="/authors"')
      expect(response.text).toContain('<a href="/printing-companies"')
      expect(response.text).toContain('<a href="/submissions"')
    })
  })

  describe('印刷所一覧ページ', () => {
    it('ヘッダーに全ての主要ナビゲーションリンクが存在する', async () => {
      // Act: GET /printing-companiesにリクエスト
      const response = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全ての主要ナビゲーションリンクが存在することを確認
      expect(response.text).toContain('<a href="/"')
      expect(response.text).toContain('<a href="/books"')
      expect(response.text).toContain('<a href="/authors"')
      expect(response.text).toContain('<a href="/printing-companies"')
      expect(response.text).toContain('<a href="/submissions"')
    })
  })

  describe('入稿一覧ページ', () => {
    it('ヘッダーに全ての主要ナビゲーションリンクが存在する', async () => {
      // Act: GET /submissionsにリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全ての主要ナビゲーションリンクが存在することを確認
      expect(response.text).toContain('<a href="/"')
      expect(response.text).toContain('<a href="/books"')
      expect(response.text).toContain('<a href="/authors"')
      expect(response.text).toContain('<a href="/printing-companies"')
      expect(response.text).toContain('<a href="/submissions"')
    })
  })

  describe('ホームページ', () => {
    it('ヘッダーに全ての主要ナビゲーションリンクが存在する', async () => {
      // Act: GET /にリクエスト
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全ての主要ナビゲーションリンクが存在することを確認
      expect(response.text).toContain('<a href="/"')
      expect(response.text).toContain('<a href="/books"')
      expect(response.text).toContain('<a href="/authors"')
      expect(response.text).toContain('<a href="/printing-companies"')
      expect(response.text).toContain('<a href="/submissions"')
    })
  })

  describe('ナビゲーションの構造', () => {
    it('ナビゲーションが適切なHTML構造を持つ', async () => {
      // Act: GET /booksにリクエスト
      const response = await request(app.getHttpServer())
        .get('/books')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: nav要素が存在し、適切な構造を持つことを確認
      expect(response.text).toContain('<nav')
      expect(response.text).toContain('</nav>')
      expect(response.text).toMatch(
        /<nav[^>]*>[\s\S]*<a[^>]*href=["'][^"']*["'][^>]*>[\s\S]*<\/nav>/,
      )
    })

    it('全ナビゲーションリンクが正しい順序で配置される', async () => {
      // Act: GET /booksにリクエスト
      const response = await request(app.getHttpServer())
        .get('/books')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: リンクが期待する順序で存在することを確認
      const navSection = response.text.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || ''

      // ホームが最初に来ることを確認
      const homeIndex = navSection.indexOf('href="/"')
      const booksIndex = navSection.indexOf('href="/books"')
      const authorsIndex = navSection.indexOf('href="/authors"')
      const printingIndex = navSection.indexOf('href="/printing-companies"')
      const submissionsIndex = navSection.indexOf('href="/submissions"')

      expect(homeIndex).toBeGreaterThan(-1)
      expect(booksIndex).toBeGreaterThan(homeIndex)
      expect(authorsIndex).toBeGreaterThan(booksIndex)
      expect(printingIndex).toBeGreaterThan(authorsIndex)
      expect(submissionsIndex).toBeGreaterThan(printingIndex)
    })
  })
})
