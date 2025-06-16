import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { AppModule } from '../../../src/app.module'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import * as schema from '../../../src/db/schema'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Authors update', () => {
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

  describe('GET /authors/:id/edit', () => {
    it('既存執筆者の編集フォームを表示する', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '山田太郎',
          email: 'yamada@example.com',
          bio: 'フロントエンド開発が得意です',
        })
        .returning()

      // Act: GET /authors/:id/editにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/authors/${author.id}/edit`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: フォーム要素と既存データが含まれることを確認
      expect(response.text).toContain('<form')
      expect(response.text).toContain('name="name"')
      expect(response.text).toContain('name="email"')
      expect(response.text).toContain('name="bio"')
      expect(response.text).toContain('山田太郎')
      expect(response.text).toContain('yamada@example.com')
      expect(response.text).toContain('フロントエンド開発が得意です')
      expect(response.text).toMatch(/<title>.*執筆者.*編集.*<\/title>/i)
    })

    it('存在しない執筆者IDの場合、404エラーを返す', async () => {
      // Act: 存在しない執筆者IDでリクエスト
      await request(app.getHttpServer()).get('/authors/999/edit').expect(404)
    })

    it('無効な執筆者IDの場合、400エラーを返す', async () => {
      // Act: 無効なIDでリクエスト
      await request(app.getHttpServer())
        .get('/authors/invalid/edit')
        .expect(400)
    })
  })

  describe('PUT /authors/:id (via POST with _method=PUT)', () => {
    it('有効なデータで執筆者を更新し、詳細ページにリダイレクトする', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '山田太郎',
          email: 'yamada@example.com',
          bio: 'フロントエンド開発が得意です',
        })
        .returning()

      const updateData = {
        _method: 'PUT',
        name: '山田花子',
        email: 'yamada.hanako@example.com',
        bio: 'フルスタック開発者として活動しています',
      }

      // Act: POST /authors/:id with _method=PUTにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/authors/${author.id}`)
        .send(updateData)
        .expect(302)

      // Assert: リダイレクト先が正しいことを確認
      expect(response.headers.location).toBe(`/authors/${author.id}`)

      // データベースが更新されていることを確認
      const updatedAuthors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(updatedAuthors).toHaveLength(1)
      expect(updatedAuthors[0].name).toBe('山田花子')
      expect(updatedAuthors[0].email).toBe('yamada.hanako@example.com')
      expect(updatedAuthors[0].bio).toBe(
        'フルスタック開発者として活動しています',
      )
    })

    it('nameが空の場合、エラーを表示して編集フォームを再表示する', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '山田太郎',
          email: 'yamada@example.com',
          bio: 'フロントエンド開発が得意です',
        })
        .returning()

      const updateData = {
        _method: 'PUT',
        name: '',
        email: 'yamada@example.com',
        bio: 'フロントエンド開発が得意です',
      }

      // Act: POST /authors/:id with _method=PUTにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/authors/${author.id}`)
        .send(updateData)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: エラーメッセージが表示されることを確認
      expect(response.text).toMatch(/名前.*必須|name.*required/i)
      expect(response.text).toContain('<form')

      // データベースが更新されていないことを確認
      const unchangedAuthors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(unchangedAuthors[0].name).toBe('山田太郎')
    })

    it('emailとbioを空にして更新できる', async () => {
      // Arrange: テストデータを作成
      const [author] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '山田太郎',
          email: 'yamada@example.com',
          bio: 'フロントエンド開発が得意です',
        })
        .returning()

      const updateData = {
        _method: 'PUT',
        name: '山田太郎',
        email: '',
        bio: '',
      }

      // Act: POST /authors/:id with _method=PUTにリクエスト
      await request(app.getHttpServer())
        .post(`/authors/${author.id}`)
        .send(updateData)
        .expect(302)

      // Assert: データベースが更新されていることを確認
      const updatedAuthors = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, author.id))
      expect(updatedAuthors[0].email).toBeNull()
      expect(updatedAuthors[0].bio).toBeNull()
    })

    it('存在しない執筆者IDの場合、404エラーを返す', async () => {
      // Arrange: 更新データを準備
      const updateData = {
        _method: 'PUT',
        name: '山田太郎',
        email: 'yamada@example.com',
        bio: 'テスト',
      }

      // Act: 存在しない執筆者IDでリクエスト
      await request(app.getHttpServer())
        .post('/authors/999')
        .send(updateData)
        .expect(404)
    })

    it('他の執筆者と重複するemailの場合、エラーを表示する', async () => {
      // Arrange: 2つの執筆者を作成
      await drizzleService.db.insert(schema.authors).values({
        name: '執筆者A',
        email: 'author-a@example.com',
        bio: 'プロフィールA',
      })

      const [authorB] = await drizzleService.db
        .insert(schema.authors)
        .values({
          name: '執筆者B',
          email: 'author-b@example.com',
          bio: 'プロフィールB',
        })
        .returning()

      const updateData = {
        _method: 'PUT',
        name: '執筆者B',
        email: 'author-a@example.com', // 執筆者Aと重複するemail
        bio: 'プロフィールB',
      }

      // Act: POST /authors/:id with _method=PUTにリクエスト
      const response = await request(app.getHttpServer())
        .post(`/authors/${authorB.id}`)
        .send(updateData)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: エラーメッセージが表示されることを確認
      expect(response.text).toMatch(
        /メールアドレス.*既に使用|email.*already exists/i,
      )

      // データベースが更新されていないことを確認
      const unchangedAuthor = await drizzleService.db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.id, authorB.id))
      expect(unchangedAuthor[0].email).toBe('author-b@example.com')
    })
  })
})
