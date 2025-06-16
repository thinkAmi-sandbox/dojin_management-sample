import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('GET /authors/:id', () => {
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
    await drizzleService.db.delete(schema.authors)
  })

  it('存在する執筆者の詳細情報を表示する', async () => {
    // Arrange: テストデータを作成
    const [author] = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: '山田太郎',
        email: 'yamada@example.com',
        bio: 'フロントエンド開発が得意で、特にReactとTypeScriptを使った開発を専門としています。',
      })
      .returning()

    // Act: GET /authors/:idにリクエスト
    const response = await request(app.getHttpServer())
      .get(`/authors/${author.id}`)
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: HTML内容を確認
    expect(response.text).toContain('山田太郎')
    expect(response.text).toContain('yamada@example.com')
    expect(response.text).toContain(
      'フロントエンド開発が得意で、特にReactとTypeScriptを使った開発を専門としています。',
    )
    expect(response.text).toMatch(/<title>.*執筆者詳細.*<\/title>/i)
  })

  it('emailとbioがnullの執筆者も正しく表示する', async () => {
    // Arrange: emailとbioがnullのテストデータを作成
    const [author] = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: '佐藤次郎',
        email: null,
        bio: null,
      })
      .returning()

    // Act: GET /authors/:idにリクエスト
    const response = await request(app.getHttpServer())
      .get(`/authors/${author.id}`)
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: HTML内容を確認
    expect(response.text).toContain('佐藤次郎')
    // emailとbioがnullの場合の表示を確認
    expect(response.text).toMatch(/メール.*未設定|メールアドレス.*なし/i)
    expect(response.text).toMatch(/自己紹介.*未設定|プロフィール.*なし/i)
  })

  it('存在しない執筆者IDの場合、404エラーを返す', async () => {
    // Act: 存在しない執筆者IDでリクエスト
    await request(app.getHttpServer()).get('/authors/999').expect(404)
  })

  it('無効な執筆者IDの場合、400エラーを返す', async () => {
    // Act: 無効なIDでリクエスト
    await request(app.getHttpServer()).get('/authors/invalid').expect(400)
  })

  it('HTMLの基本構造が正しいことを確認する', async () => {
    // Arrange: テストデータを作成
    const [author] = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: '山田太郎',
        email: 'yamada@example.com',
        bio: 'テスト用プロフィール',
      })
      .returning()

    // Act: GET /authors/:idにリクエスト
    const response = await request(app.getHttpServer())
      .get(`/authors/${author.id}`)
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: 基本的なHTML構造を確認
    expect(response.text).toContain('<!DOCTYPE html>')
    expect(response.text).toContain('<html')
    expect(response.text).toContain('</html>')
  })
})
