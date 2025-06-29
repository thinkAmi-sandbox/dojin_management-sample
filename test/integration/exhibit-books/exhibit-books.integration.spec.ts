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
  let _testBookId1: number
  let _testBookId2: number
  let testEditionId1: number
  let testEditionId2: number

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

    _testBookId1 = book1.id
    _testBookId2 = book2.id

    // テスト用の版を作成
    const [edition1] = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: book1.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        isActive: true,
      })
      .returning()

    const [edition2] = await drizzleService.db
      .insert(schema.editions)
      .values({
        bookId: book2.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1500,
        isActive: true,
      })
      .returning()

    testEditionId1 = edition1.id
    testEditionId2 = edition2.id
  })

  // Phase 1: ミニマム実装テスト（1-2テスト）
  describe('GET /exhibits/:exhibitId/books', () => {
    it('出展の頒布書籍一覧が表示される', async () => {
      // テスト用の出展書籍データを作成（版対応）
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        editionId: testEditionId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books`)
        .expect(200)

      expect(response.text).toContain('頒布書籍一覧')
      expect(response.text).toContain('テスト書籍1_')
      expect(response.text).toContain('初版') // 版名が表示される
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
        editionId: testEditionId1,
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
      expect(exhibitBooks[0].editionId).toBe(testEditionId1)
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
          // editionIdが不足
          plannedQuantity: 100,
          price: 1500,
        })
        .expect(200) // ValidationExceptionFilterはHTMLで200を返す

      expect(response.text).toContain('版を選択してください')
    })

    it('重複する版を追加しようとすると400エラーになる', async () => {
      // 既に版を追加
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        editionId: testEditionId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      // 同じ版を再追加しようとする
      const response = await request(app.getHttpServer())
        .post(`/exhibits/${testExhibitId}/books`)
        .send({
          editionId: testEditionId1,
          plannedQuantity: 100,
          price: 1500,
          displayOrder: 1,
        })
        .expect(400)

      expect(response.text).toContain('この版は既に追加されています')
    })
  })

  // Phase 3: 版対応の数量管理テスト
  describe('PUT /exhibits/:exhibitId/books/:editionId', () => {
    it('出展書籍の数量情報が更新される', async () => {
      // テスト用の出展書籍データを作成
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        editionId: testEditionId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      // 数量情報を更新
      await request(app.getHttpServer())
        .post(`/exhibits/${testExhibitId}/books/${testEditionId1}`)
        .send({
          _method: 'PUT',
          plannedQuantity: 50,
          actualQuantity: 45,
          soldQuantity: 30,
          price: 1000,
          displayOrder: 1,
        })
        .expect(302)

      // データベース確認
      const [updated] = await drizzleService.db
        .select()
        .from(schema.exhibitBooks)
        .where(eq(schema.exhibitBooks.exhibitId, testExhibitId))

      expect(updated.actualQuantity).toBe(45)
      expect(updated.soldQuantity).toBe(30)
      expect(updated.remainingQuantity).toBe(15) // 45 - 30
    })
  })

  // Phase 4: エッジケーステスト（残りテスト）
  describe('DELETE /exhibits/:exhibitId/books/:editionId', () => {
    it('頒布書籍が削除される', async () => {
      // テスト用の出展書籍データを作成（版対応）
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        editionId: testEditionId1,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      })

      await request(app.getHttpServer())
        .delete(`/exhibits/${testExhibitId}/books/${testEditionId1}`)
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

      expect(response.text).toContain('頒布版が見つかりませんでした')
    })
  })

  // Phase 5: フォーム表示のテスト
  describe('GET /exhibits/:exhibitId/books/add', () => {
    it('書籍追加フォームが表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books/add`)
        .expect(200)

      expect(response.text).toContain('頒布書籍追加')
      expect(response.text).toContain('版選択')
      expect(response.text).toContain('テスト書籍1_')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('定価: 1,000円')
    })

    it('追加可能な版がない場合は適切なメッセージが表示される', async () => {
      // 全ての版を既に追加
      await drizzleService.db.insert(schema.exhibitBooks).values([
        {
          exhibitId: testExhibitId,
          editionId: testEditionId1,
          plannedQuantity: 50,
          price: 1000,
          displayOrder: 1,
        },
        {
          exhibitId: testExhibitId,
          editionId: testEditionId2,
          plannedQuantity: 30,
          price: 1500,
          displayOrder: 2,
        },
      ])

      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books/add`)
        .expect(200)

      expect(response.text).toContain('追加可能な版がありません')
    })
  })

  describe('GET /exhibits/:exhibitId/books/:editionId/edit', () => {
    it('編集フォームが表示される', async () => {
      // テスト用の出展書籍データを作成
      await drizzleService.db.insert(schema.exhibitBooks).values({
        exhibitId: testExhibitId,
        editionId: testEditionId1,
        plannedQuantity: 50,
        actualQuantity: 45,
        soldQuantity: 30,
        remainingQuantity: 15,
        price: 1000,
        displayOrder: 1,
      })

      const response = await request(app.getHttpServer())
        .get(`/exhibits/${testExhibitId}/books/${testEditionId1}/edit`)
        .expect(200)

      expect(response.text).toContain('頒布情報編集')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('1,000円') // 定価表示（formattedBasePrice）
      expect(response.text).toContain('value="50"') // plannedQuantity
      expect(response.text).toContain('value="45"') // actualQuantity
      expect(response.text).toContain('value="30"') // soldQuantity
      expect(response.text).toContain('value="15"') // remainingQuantity
    })
  })
})
