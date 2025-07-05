import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('入稿一覧画面 サブナビゲーション機能', () => {
  let app: INestApplication
  let _drizzleService: DrizzleService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    _drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
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

  describe('サブナビゲーションタブの表示', () => {
    it('入稿一覧画面に「全て」タブが存在する', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 「全て」タブが存在し、アクティブ状態であることを確認
      expect(response.text).toContain('全て')
      expect(response.text).toContain('href="/submissions"')
      expect(response.text).toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>全て/,
      )
    })

    it('入稿一覧画面に「進行中のみ」タブが存在する', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 「進行中のみ」タブが存在することを確認
      expect(response.text).toContain('進行中のみ')
      expect(response.text).toContain('href="/submissions/in-progress"')
    })

    it('入稿一覧画面に「コスト集計」タブが存在する', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 「コスト集計」タブが存在することを確認
      expect(response.text).toContain('コスト集計')
      expect(response.text).toContain('href="/submissions/costs"')
    })

    it('サブナビゲーションが適切なHTML構造を持つ', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: サブナビゲーション要素が適切な構造を持つことを確認
      expect(response.text).toContain('class="sub-navigation"')
      expect(response.text).toMatch(
        /<div[^>]*class="[^"]*sub-navigation[^"]*"[^>]*>[\s\S]*?<\/div>/,
      )
    })

    it('タブが正しい順序で配置される', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: タブが期待する順序で存在することを確認
      const subNavMatch = response.text.match(
        /<div[^>]*class="[^"]*sub-navigation[^"]*"[^>]*>[\s\S]*?<\/div>/,
      )
      expect(subNavMatch).toBeTruthy()

      const subNavSection = subNavMatch?.[0] || ''

      // 順序確認：全て → 進行中のみ → コスト集計
      const allIndex = subNavSection.indexOf('全て')
      const inProgressIndex = subNavSection.indexOf('進行中のみ')
      const costsIndex = subNavSection.indexOf('コスト集計')

      expect(allIndex).toBeGreaterThan(-1)
      expect(inProgressIndex).toBeGreaterThan(allIndex)
      expect(costsIndex).toBeGreaterThan(inProgressIndex)
    })
  })

  describe('進行中一覧画面のサブナビゲーション', () => {
    it('進行中一覧画面で「進行中のみ」タブがアクティブになる', async () => {
      // Act: GET /submissions/in-progress にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 「進行中のみ」タブがアクティブ状態であることを確認
      expect(response.text).toContain('進行中のみ')
      expect(response.text).toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>進行中のみ/,
      )

      // 他のタブは非アクティブであることを確認
      expect(response.text).not.toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>全て/,
      )
    })

    it('進行中一覧画面に全てのタブが存在する', async () => {
      // Act: GET /submissions/in-progress にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全てのタブが存在することを確認
      expect(response.text).toContain('全て')
      expect(response.text).toContain('進行中のみ')
      expect(response.text).toContain('コスト集計')
    })
  })

  describe('コスト集計画面のサブナビゲーション', () => {
    it('コスト集計画面で「コスト集計」タブがアクティブになる', async () => {
      // Act: GET /submissions/costs にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 「コスト集計」タブがアクティブ状態であることを確認
      expect(response.text).toContain('コスト集計')
      expect(response.text).toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>コスト集計/,
      )

      // 他のタブは非アクティブであることを確認
      expect(response.text).not.toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>全て/,
      )
      expect(response.text).not.toMatch(
        /class="[^"]*tab[^"]*active[^"]*"[^>]*>進行中のみ/,
      )
    })

    it('コスト集計画面に全てのタブが存在する', async () => {
      // Act: GET /submissions/costs にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 全てのタブが存在することを確認
      expect(response.text).toContain('全て')
      expect(response.text).toContain('進行中のみ')
      expect(response.text).toContain('コスト集計')
    })
  })

  describe('タブナビゲーションの動作', () => {
    it('タブクリックで正しいページに遷移する', async () => {
      // Act: 各タブページへのアクセステスト

      // 1. 通常の入稿一覧
      const allResponse = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(allResponse.text).toContain('入稿一覧')

      // 2. 進行中入稿一覧
      const inProgressResponse = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(inProgressResponse.text).toContain('進行中')

      // 3. コスト集計
      const costsResponse = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)
        .expect('Content-Type', /html/)

      expect(costsResponse.text).toContain('コスト')
    })

    it('サブナビゲーションのスタイルが統一されている', async () => {
      // Act: GET /submissions にリクエスト
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: サブナビゲーションのCSS クラスが適切であることを確認
      expect(response.text).toMatch(/class="[^"]*sub-navigation[^"]*"/)
      expect(response.text).toMatch(/class="[^"]*tab[^"]*"/)
      expect(response.text).toMatch(/class="[^"]*tab[^"]*active[^"]*"/)

      // スタイルが適用されていることを確認
      expect(response.text).toContain('border-bottom: 1px solid #ddd')
    })
  })
})
