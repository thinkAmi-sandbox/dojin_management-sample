import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Authors creation', () => {
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

  describe('GET /authors/new', () => {
    it('新規執筆者作成フォームを表示する', async () => {
      // Act: GET /authors/newにリクエスト
      const response = await request(app.getHttpServer())
        .get('/authors/new')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: フォーム要素が含まれることを確認
      expect(response.text).toContain('<form')
      expect(response.text).toContain('name="name"')
      expect(response.text).toContain('name="email"')
      expect(response.text).toContain('name="bio"')
      expect(response.text).toMatch(/<title>.*執筆者.*作成.*<\/title>/i)
    })

    it('HTMLの基本構造が正しいことを確認する', async () => {
      // Act: GET /authors/newにリクエスト
      const response = await request(app.getHttpServer())
        .get('/authors/new')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 基本的なHTML構造を確認
      expect(response.text).toContain('<!DOCTYPE html>')
      expect(response.text).toContain('<html')
      expect(response.text).toContain('</html>')
    })
  })

  describe('POST /authors', () => {
    it('有効なデータで執筆者を作成し、一覧ページにリダイレクトする', async () => {
      // Arrange: 作成データを準備
      const authorData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        bio: 'フロントエンド開発が得意です',
      }

      // Act: POST /authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(authorData)
        .expect(302)

      // Assert: リダイレクト先が正しいことを確認
      expect(response.headers.location).toBe('/authors')

      // データベースに保存されていることを確認
      const authors = await drizzleService.db.select().from(schema.authors)
      expect(authors).toHaveLength(1)
      expect(authors[0].name).toBe('山田太郎')
      expect(authors[0].email).toBe('yamada@example.com')
      expect(authors[0].bio).toBe('フロントエンド開発が得意です')
    })

    it('emailとbioが空の場合でも執筆者を作成できる', async () => {
      // Arrange: nameのみのデータを準備
      const authorData = {
        name: '佐藤次郎',
        email: '',
        bio: '',
      }

      // Act: POST /authorsにリクエスト
      await request(app.getHttpServer())
        .post('/authors')
        .send(authorData)
        .expect(302)

      // Assert: データベースに保存されていることを確認
      const authors = await drizzleService.db.select().from(schema.authors)
      expect(authors).toHaveLength(1)
      expect(authors[0].name).toBe('佐藤次郎')
      expect(authors[0].email).toBeNull()
      expect(authors[0].bio).toBeNull()
    })

    it('nameが空の場合、エラーを表示してフォームを再表示する', async () => {
      // Arrange: nameが空のデータを準備
      const authorData = {
        name: '',
        email: 'test@example.com',
        bio: 'テスト用プロフィール',
      }

      // Act: POST /authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(authorData)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: エラーメッセージが表示されることを確認
      expect(response.text).toMatch(/名前.*必須|name.*required/i)
      expect(response.text).toContain('<form')

      // データベースに保存されていないことを確認
      const authors = await drizzleService.db.select().from(schema.authors)
      expect(authors).toHaveLength(0)
    })

    it('重複するemailの場合、エラーを表示する', async () => {
      // Arrange: 既存の執筆者を作成
      await drizzleService.db.insert(schema.authors).values({
        name: '既存執筆者',
        email: 'existing@example.com',
        bio: '既存のプロフィール',
      })

      const authorData = {
        name: '新規執筆者',
        email: 'existing@example.com', // 重複するemail
        bio: '新規プロフィール',
      }

      // Act: POST /authorsにリクエスト
      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(authorData)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: エラーメッセージが表示されることを確認
      expect(response.text).toMatch(
        /メールアドレス.*既に使用|email.*already exists/i,
      )

      // データベースに新しい執筆者が追加されていないことを確認
      const authors = await drizzleService.db.select().from(schema.authors)
      expect(authors).toHaveLength(1)
      expect(authors[0].name).toBe('既存執筆者')
    })
  })
})
