import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Books Creation', () => {
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

  describe('GET /books/new', () => {
    it('新規書籍作成フォームが表示される', async () => {
      // Act: GET /books/newにリクエスト
      const response = await request(app.getHttpServer())
        .get('/books/new')
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: HTMLの基本構造を確認
      expect(response.text).toContain('<!DOCTYPE html>')
      expect(response.text).toContain('<html')
      expect(response.text).toContain('</html>')
      expect(response.text).toMatch(/<title>.*新規.*書籍.*<\/title>/i)
    })

    it('必要なフォーム要素が含まれている', async () => {
      // Act: GET /books/newにリクエスト
      const response = await request(app.getHttpServer())
        .get('/books/new')
        .expect(200)

      // Assert: フォーム要素の存在を確認
      expect(response.text).toContain('<form')
      expect(response.text).toMatch(/action="\/books"/)
      expect(response.text).toMatch(/method="post"/i)

      // 各入力フィールドの存在を確認
      expect(response.text).toMatch(/name="title"/)
      expect(response.text).toMatch(/name="subtitle"/)
      expect(response.text).toMatch(/name="description"/)

      // 送信ボタンの存在を確認
      expect(response.text).toMatch(/type="submit"/)
    })
  })

  describe('POST /books', () => {
    it('有効なデータで書籍が正常に作成される', async () => {
      // Arrange: 書籍データを準備
      const bookData = {
        title: 'TypeScript完全ガイド',
        subtitle: '実践編',
        description: 'TypeScriptの実践的な使い方を学ぶ',
      }

      // Act: POST /booksにリクエスト
      const response = await request(app.getHttpServer())
        .post('/books')
        .send(bookData)
        .expect(302) // リダイレクト

      // Assert: リダイレクト先を確認
      expect(response.headers.location).toBe('/books')

      // データベースに保存されていることを確認
      const savedBooks = await drizzleService.db.select().from(schema.books)
      expect(savedBooks).toHaveLength(1)
      expect(savedBooks[0].title).toBe(bookData.title)
      expect(savedBooks[0].subtitle).toBe(bookData.subtitle)
      expect(savedBooks[0].description).toBe(bookData.description)
    })

    it('タイトルのみで書籍が作成される（他のフィールドはオプショナル）', async () => {
      // Arrange: 最小限のデータを準備
      const bookData = {
        title: 'NestJS基礎',
      }

      // Act: POST /booksにリクエスト
      const _response = await request(app.getHttpServer())
        .post('/books')
        .send(bookData)
        .expect(302)

      // Assert: データベースに保存されていることを確認
      const savedBooks = await drizzleService.db.select().from(schema.books)
      expect(savedBooks).toHaveLength(1)
      expect(savedBooks[0].title).toBe(bookData.title)
      expect(savedBooks[0].subtitle).toBeNull()
      expect(savedBooks[0].description).toBeNull()
    })

    it('タイトルが未入力の場合、適切なエラーが表示される', async () => {
      // Arrange: タイトルなしのデータを準備
      const bookData = {
        subtitle: 'サブタイトルのみ',
        description: '説明のみ',
      }

      // Act: POST /booksにリクエスト
      const response = await request(app.getHttpServer())
        .post('/books')
        .send(bookData)
        .expect(200) // ValidationExceptionFilterはHTMLで200を返す

      // Assert: エラーメッセージが含まれていることを確認
      expect(response.text).toMatch(/タイトルは必須です/)
      expect(response.text).toContain('新規書籍作成')

      // データベースに保存されていないことを確認
      const savedBooks = await drizzleService.db.select().from(schema.books)
      expect(savedBooks).toHaveLength(0)
    })

    it('タイトルが長すぎる場合、適切なバリデーションエラーが発生する', async () => {
      // Arrange: 長すぎるタイトルのデータを準備（255文字超）
      const longTitle = 'a'.repeat(256)
      const bookData = {
        title: longTitle,
        subtitle: '正常なサブタイトル',
        description: '正常な説明',
      }

      // Act: POST /booksにリクエスト
      const response = await request(app.getHttpServer())
        .post('/books')
        .send(bookData)
        .expect(200) // ValidationExceptionFilterはHTMLで200を返す

      // Assert: バリデーションエラーメッセージを確認
      expect(response.text).toMatch(/タイトルは255文字以内で入力してください/)
      expect(response.text).toContain('新規書籍作成')

      // データベースに保存されていないことを確認
      const savedBooks = await drizzleService.db.select().from(schema.books)
      expect(savedBooks).toHaveLength(0)
    })
  })
})
