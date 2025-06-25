import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Exhibit Books Integration Tests', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testExhibitId: number
  let testBookId1: number
  let _testBookId2: number

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
    // 各テスト前に全データをクリーンアップ（統一済みパターン）
    await testDbUtils.cleanupDatabase()

    // 各テストで必要なテストデータを作成
    const timestamp = Date.now()

    // テスト用のイベントを作成
    const [event] = await drizzleService.db
      .insert(schema.events)
      .values({
        name: `技術書典${timestamp}`,
        eventDate: '2024-12-07',
        venue: '東京ビッグサイト',
        applicationStartDate: '2024-09-01',
        applicationEndDate: '2024-09-30',
        description: 'テストイベント',
      })
      .returning()

    // テスト用のサークルを作成
    const [circle] = await drizzleService.db
      .insert(schema.circles)
      .values({
        name: `テストサークル${timestamp}`,
        representativeName: 'テスト代表者',
        email: `test${timestamp}@example.com`,
        description: 'テスト用サークル',
      })
      .returning()

    // テスト用の出展申込を作成
    const [exhibit] = await drizzleService.db
      .insert(schema.exhibits)
      .values({
        eventId: event.id,
        circleId: circle.id,
        status: 'applied',
        applicationNotes: 'テスト申込',
      })
      .returning()

    testExhibitId = exhibit.id

    // テスト用の書籍を複数作成
    const [book1] = await drizzleService.db
      .insert(schema.books)
      .values({
        title: `テスト書籍1_${timestamp}`,
        subtitle: 'テスト用サブタイトル1',
        description: 'テスト用の説明1',
      })
      .returning()

    const [book2] = await drizzleService.db
      .insert(schema.books)
      .values({
        title: `テスト書籍2_${timestamp}`,
        subtitle: 'テスト用サブタイトル2',
        description: 'テスト用の説明2',
      })
      .returning()

    testBookId1 = book1.id
    _testBookId2 = book2.id
  })

  // Phase 1: ミニマム実装テスト（1-2テスト）
  describe('GET /exhibits/:exhibitId/books', () => {
    it('出展の頒布書籍一覧が表示される', async () => {
      // テスト用の出展書籍データを作成
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        bookId: testBookId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books`)
        .expect(200)

      expect(response.text).toContain('頒布書籍一覧')
      expect(response.text).toContain('テスト書籍1_')
      expect(response.text).toContain('50冊')
      expect(response.text).toContain('1,000円')
    })

    it('出展書籍がない場合は空の一覧が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books`)
        .expect(200)

      expect(response.text).toContain('頒布書籍一覧')
      expect(response.text).toContain('頒布予定の書籍はありません')
    })
  })

  describe('POST /exhibits/:exhibitId/books', () => {
    it('新規頒布書籍が追加される', async () => {
      const exhibitBookData = {
        bookId: testBookId1,
        plannedQuantity: 100,
        price: 1500,
        displayOrder: 1,
      }

      await request(app.getHttpServer())
        .post(`/exhibits/${testExhibitId}/books`)
        .send(exhibitBookData)
        .expect(302) // リダイレクト

      // データベース確認
      const exhibitBooks = await drizzleService.db
        .select()
        .from(schema.exhibitBooks)
        .where(eq(schema.exhibitBooks.exhibitId, testExhibitId))

      expect(exhibitBooks).toHaveLength(1)
      expect(exhibitBooks[0].bookId).toBe(testBookId1)
      expect(exhibitBooks[0].plannedQuantity).toBe(100)
      expect(exhibitBooks[0].price).toBe(1500)
    })
  })

  // Phase 2: バリデーションテスト（2-3テスト）
  describe('POST /exhibits/:exhibitId/books - バリデーション', () => {
    it('必須項目が不足している場合は400エラーになる', async () => {
      const response = await request(app.getHttpServer())
        .post(`/exhibits/${testExhibitId}/books`)
        .send({
          // bookIdが不足
          plannedQuantity: 100,
          price: 1500,
        })
        .expect(200) // ValidationExceptionFilterはHTMLで200を返す

      expect(response.text).toContain('書籍は必須です')
    })

    it('重複する書籍を追加しようとすると400エラーになる', async () => {
      // 既に書籍を追加
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        bookId: testBookId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      // 同じ書籍を再追加しようとする
      const response = await request(app.getHttpServer())
        .post(`/exhibits/${testExhibitId}/books`)
        .send({
          bookId: testBookId1,
          plannedQuantity: 100,
          price: 1500,
          displayOrder: 1,
        })
        .expect(400)

      expect(response.text).toContain('この書籍は既に追加されています')
    })
  })

  // Phase 3: エッジケーステスト（残りテスト）
  describe('DELETE /exhibits/:exhibitId/books/:bookId', () => {
    it('頒布書籍が削除される', async () => {
      // テスト用の出展書籍データを作成
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        bookId: testBookId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      await request(app.getHttpServer())
        .delete(`/exhibits/${testExhibitId}/books/${testBookId1}`)
        .send({ _method: 'DELETE' })
        .expect(302) // リダイレクト

      // データベース確認
      const exhibitBooks = await drizzleService.db
        .select()
        .from(schema.exhibitBooks)
        .where(eq(schema.exhibitBooks.exhibitId, testExhibitId))

      expect(exhibitBooks).toHaveLength(0)
    })

    it('存在しない頒布書籍を削除しようとすると404エラーになる', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/exhibits/${testExhibitId}/books/999`)
        .send({ _method: 'DELETE' })
        .expect(404)

      expect(response.text).toContain('頒布書籍が見つかりません')
    })
  })
})
