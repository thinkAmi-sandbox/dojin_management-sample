import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { type Book, books, deadlines } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('Deadlines (Integration)', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: Book

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()

    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()

    // テスト用の書籍を作成
    const [book] = await drizzleService.db
      .insert(books)
      .values({
        title: 'テスト書籍',
        subtitle: 'テストサブタイトル',
        description: 'テスト説明',
        pageCount: 100,
        status: 'writing',
      })
      .returning()
    testBook = book
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /books/:bookId/deadlines', () => {
    it('書籍が存在しない場合は404エラーを返す', () => {
      return request(app.getHttpServer())
        .get('/books/999999/deadlines')
        .expect(404)
    })

    it('締切が存在しない場合は空のリストを表示する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/deadlines`)
        .expect(200)

      expect(response.text).toContain('締切一覧')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('締切がありません')
    })

    it('締切が存在する場合はリストを表示する', async () => {
      // テスト用の締切を作成
      await drizzleService.db.insert(deadlines).values([
        {
          bookId: testBook.id,
          title: '初稿締切',
          dueDate: new Date('2024-12-31'),
          description: '初稿の提出期限',
        },
        {
          bookId: testBook.id,
          title: '最終締切',
          dueDate: new Date('2025-01-15'),
          description: '最終原稿の提出期限',
        },
      ])

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/deadlines`)
        .expect(200)

      expect(response.text).toContain('締切一覧')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('初稿締切')
      expect(response.text).toContain('2024年12月31日')
      expect(response.text).toContain('最終締切')
      expect(response.text).toContain('2025年1月15日')
    })

    it('パンくずリストが正しく表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/deadlines`)
        .expect(200)

      expect(response.text).toContain('書籍一覧')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('締切一覧')
    })

    it('新規締切作成へのリンクが表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/deadlines`)
        .expect(200)

      expect(response.text).toContain(`/books/${testBook.id}/deadlines/new`)
      expect(response.text).toContain('新規締切作成')
    })
  })

  describe('DELETE /deadlines/:id', () => {
    it('存在しない締切を削除しようとすると404エラーを返す', () => {
      return request(app.getHttpServer())
        .delete('/deadlines/999999')
        .expect(404)
    })

    it('締切を正常に削除できる', async () => {
      // テスト用の締切を作成
      const [deadline] = await drizzleService.db
        .insert(deadlines)
        .values({
          bookId: testBook.id,
          title: '削除テスト締切',
          dueDate: new Date('2024-12-31'),
          description: '削除テスト用の締切',
        })
        .returning()

      // 削除リクエストを送信
      await request(app.getHttpServer())
        .delete(`/deadlines/${deadline.id}`)
        .expect(302) // リダイレクト

      // 削除後、一覧から該当の締切が消えていることを確認
      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}/deadlines`)
        .expect(200)

      expect(response.text).not.toContain('削除テスト締切')
    })

    it('削除後は締切一覧ページにリダイレクトされる', async () => {
      // テスト用の締切を作成
      const [deadline] = await drizzleService.db
        .insert(deadlines)
        .values({
          bookId: testBook.id,
          title: 'リダイレクトテスト締切',
          dueDate: new Date('2024-12-31'),
          description: 'リダイレクトテスト用の締切',
        })
        .returning()

      // 削除リクエストを送信し、リダイレクト先を確認
      const response = await request(app.getHttpServer())
        .delete(`/deadlines/${deadline.id}`)
        .expect(302)

      expect(response.headers.location).toBe(`/books/${testBook.id}/deadlines`)
    })
  })
})
