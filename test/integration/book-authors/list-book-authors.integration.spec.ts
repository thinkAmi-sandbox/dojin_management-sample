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

describe('List Book Authors', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBookId: number
  let testAuthor1Id: number
  let testAuthor2Id: number

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
    // 各テスト前にタイムスタンプベースのユニークなデータを作成
    const timestamp = Date.now()

    // テスト用の書籍を作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: `テスト書籍_${timestamp}`,
        subtitle: 'テスト用サブタイトル',
        description: 'テスト用の説明',
        pageCount: 100,
      })
      .returning()
    testBookId = bookResult[0].id

    // テスト用の執筆者を作成（ユニークなメール）
    const author1Result = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: `テスト執筆者1_${timestamp}`,
        email: `test-author-1-${timestamp}@example.com`,
        bio: 'テスト用執筆者1の経歴',
      })
      .returning()
    testAuthor1Id = author1Result[0].id

    const author2Result = await drizzleService.db
      .insert(schema.authors)
      .values({
        name: `テスト執筆者2_${timestamp}`,
        email: `test-author-2-${timestamp}@example.com`,
        bio: 'テスト用執筆者2の経歴',
      })
      .returning()
    testAuthor2Id = author2Result[0].id
  })

  afterEach(async () => {
    // 各テスト後に全データをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:bookId/authors', () => {
    it('関連付けられた執筆者が正しく表示される', async () => {
      // Arrange: 複数の執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values([
        {
          bookId: testBookId,
          authorId: testAuthor1Id,
        },
        {
          bookId: testBookId,
          authorId: testAuthor2Id,
        },
      ])

      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)
        .expect('Content-Type', /html/)

      // Assert: 両方の執筆者が表示されていることを確認
      expect(response.text).toContain('テスト執筆者1_')
      expect(response.text).toMatch(/test-author-1-\d+@example\.com/)
      expect(response.text).toContain('テスト執筆者2_')
      expect(response.text).toMatch(/test-author-2-\d+@example\.com/)

      // 書籍情報も表示されていることを確認
      expect(response.text).toContain('テスト書籍_')
    })

    it('執筆者の詳細情報（名前、メール、経歴）が表示される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 執筆者の詳細情報が表示されていることを確認
      expect(response.text).toContain('テスト執筆者1_')
      expect(response.text).toMatch(/test-author-1-\d+@example\.com/)
      expect(response.text).toContain('テスト用執筆者1の経歴')
    })

    it('各執筆者に削除ボタンが表示される', async () => {
      // Arrange: 執筆者を書籍に関連付け
      await drizzleService.db.insert(schema.bookAuthors).values({
        bookId: testBookId,
        authorId: testAuthor1Id,
      })

      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 削除フォームが存在することを確認
      expect(response.text).toMatch(/<form.*method="post"/i)
      expect(response.text).toMatch(/name="_method".*value="DELETE"/i)
      expect(response.text).toMatch(/削除/)
    })

    it('執筆者追加リンクが表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 執筆者追加リンクが存在することを確認
      expect(response.text).toMatch(
        new RegExp(`href="/books/${testBookId}/authors/add"`),
      )
      expect(response.text).toMatch(/執筆者.*追加/i)
    })

    it('パンくずリストが正しく表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: パンくずリストの各要素が含まれていることを確認
      expect(response.text).toContain('書籍一覧')
      expect(response.text).toContain('テスト書籍_')
      expect(response.text).toContain('執筆者')
      expect(response.text).toMatch(/href="\/books"/i)
      expect(response.text).toMatch(new RegExp(`href="/books/${testBookId}"`))
    })

    it('執筆者がいない場合、適切なメッセージが表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト（関連付けなし）
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 空の状態を示すメッセージが表示される
      expect(response.text).toMatch(/執筆者.*登録されていません|執筆者.*0.*人/i)

      // 執筆者追加リンクは表示される
      expect(response.text).toMatch(
        new RegExp(`href="/books/${testBookId}/authors/add"`),
      )
    })

    it('複数の執筆者が名前順で表示される', async () => {
      // Arrange: 名前順になっていない順序で執筆者を関連付け
      await drizzleService.db.insert(schema.bookAuthors).values([
        {
          bookId: testBookId,
          authorId: testAuthor2Id, // "テスト執筆者2"
        },
        {
          bookId: testBookId,
          authorId: testAuthor1Id, // "テスト執筆者1"
        },
      ])

      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 名前順で表示されていることを確認
      const author1Index = response.text.indexOf('テスト執筆者1_')
      const author2Index = response.text.indexOf('テスト執筆者2_')
      expect(author1Index).toBeLessThan(author2Index)
    })

    it('書籍詳細ページに戻るリンクが表示される', async () => {
      // Act: GET /books/:bookId/authorsにリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${testBookId}/authors`)
        .expect(200)

      // Assert: 書籍詳細ページに戻るリンクが存在することを確認
      expect(response.text).toMatch(new RegExp(`href="/books/${testBookId}"`))
      expect(response.text).toMatch(/詳細.*戻る|書籍.*詳細/i)
    })
  })
})
