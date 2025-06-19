import { HttpStatus, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books, printingCompanies, submissions } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { setupTestApp } from '../setup-test-app'

describe('Submissions - Create (Integration)', () => {
  let app: INestApplication
  let drizzle: DrizzleService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    setupTestApp(app)
    await app.init()
    drizzle = app.get(DrizzleService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // データベースをクリーンアップ（外部キー制約を考慮した順序）
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "Submission" RESTART IDENTITY CASCADE`,
    )
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "BookAuthor" RESTART IDENTITY CASCADE`,
    )
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "Deadline" RESTART IDENTITY CASCADE`,
    )
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "Book" RESTART IDENTITY CASCADE`,
    )
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "Author" RESTART IDENTITY CASCADE`,
    )
    await drizzle.db.execute(
      sql`TRUNCATE TABLE "PrintingCompany" RESTART IDENTITY CASCADE`,
    )
  })

  describe('GET /books/:bookId/submissions/new', () => {
    it('should display new submission form with printing companies', async () => {
      // テストデータ準備
      const [book] = await drizzle.db
        .insert(books)
        .values({
          title: 'テスト本',
          subtitle: 'サブタイトル',
          description: '説明文',
          pageCount: 100,
          status: 'planning',
        })
        .returning()

      const printingCompanyData = [
        { name: '印刷所A', websiteUrl: 'https://a.example.com' },
        { name: '印刷所B', websiteUrl: 'https://b.example.com' },
        { name: '印刷所C', websiteUrl: 'https://c.example.com' },
      ]
      await drizzle.db.insert(printingCompanies).values(printingCompanyData)

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get(`/books/${book.id}/submissions/new`)
        .expect(HttpStatus.OK)

      // レスポンス検証
      expect(response.text).toContain('入稿作成')
      expect(response.text).toContain('テスト本')
      expect(response.text).toContain('印刷所を選択')
      expect(response.text).toContain('印刷所A')
      expect(response.text).toContain('印刷所B')
      expect(response.text).toContain('印刷所C')
      expect(response.text).toContain('部数')
      expect(response.text).toContain('搬入先')
    })

    it('should return 404 for non-existent book', async () => {
      const response = await request(app.getHttpServer())
        .get('/books/9999/submissions/new')
        .expect(HttpStatus.NOT_FOUND)

      expect(response.text).toContain('書籍が見つかりません')
    })
  })

  describe('POST /books/:bookId/submissions', () => {
    it('should create a new submission successfully', async () => {
      // テストデータ準備
      const [book] = await drizzle.db
        .insert(books)
        .values({
          title: 'テスト本',
          subtitle: 'サブタイトル',
          description: '説明文',
          pageCount: 100,
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzle.db
        .insert(printingCompanies)
        .values({
          name: '印刷所A',
          websiteUrl: 'https://a.example.com',
        })
        .returning()

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .post(`/books/${book.id}/submissions`)
        .send({
          printingCompanyId: printingCompany.id,
          quantity: 100,
          deliveryDestination: '東京ビッグサイト',
          specificationNotes: 'A5サイズ、表紙フルカラー',
          generalNotes: '特急印刷希望',
        })
        .expect(HttpStatus.FOUND)

      // リダイレクト先確認
      expect(response.headers.location).toBe(`/books/${book.id}/submissions`)

      // データベース確認
      const [createdSubmission] = await drizzle.db
        .select()
        .from(submissions)
        .where(sql`${submissions.bookId} = ${book.id}`)

      expect(createdSubmission).toBeDefined()
      expect(createdSubmission.bookId).toBe(book.id)
      expect(createdSubmission.printingCompanyId).toBe(printingCompany.id)
      expect(createdSubmission.quantity).toBe(100)
      expect(createdSubmission.deliveryDestination).toBe('東京ビッグサイト')
      expect(createdSubmission.specificationNotes).toBe(
        'A5サイズ、表紙フルカラー',
      )
      expect(createdSubmission.generalNotes).toBe('特急印刷希望')
      expect(createdSubmission.status).toBe('draft') // デフォルト値
    })

    it('should return validation error for missing required fields', async () => {
      // テストデータ準備
      const [book] = await drizzle.db
        .insert(books)
        .values({
          title: 'テスト本',
          subtitle: 'サブタイトル',
          description: '説明文',
          pageCount: 100,
          status: 'planning',
        })
        .returning()

      // リクエスト実行（必須フィールドが不足）
      const response = await request(app.getHttpServer())
        .post(`/books/${book.id}/submissions`)
        .send({
          // printingCompanyIdとquantityが不足
          deliveryDestination: '東京ビッグサイト',
        })
        .expect(HttpStatus.BAD_REQUEST)

      expect(response.text).toContain('印刷所を選択してください')
      expect(response.text).toContain('部数を入力してください')
    })

    it('should return 404 for non-existent book', async () => {
      const [printingCompany] = await drizzle.db
        .insert(printingCompanies)
        .values({
          name: '印刷所A',
          websiteUrl: 'https://a.example.com',
        })
        .returning()

      await request(app.getHttpServer())
        .post('/books/9999/submissions')
        .send({
          printingCompanyId: printingCompany.id,
          quantity: 100,
        })
        .expect(HttpStatus.NOT_FOUND)
    })

    it('should return validation error for invalid printing company', async () => {
      const [book] = await drizzle.db
        .insert(books)
        .values({
          title: 'テスト本',
          subtitle: 'サブタイトル',
          description: '説明文',
          pageCount: 100,
          status: 'planning',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .post(`/books/${book.id}/submissions`)
        .send({
          printingCompanyId: 9999, // 存在しない印刷所ID
          quantity: 100,
        })
        .expect(HttpStatus.BAD_REQUEST)

      expect(response.text).toContain('指定された印刷所が見つかりません')
    })
  })
})
