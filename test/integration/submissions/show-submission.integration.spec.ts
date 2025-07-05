import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Submission Detail Integration Tests', () => {
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

  describe('GET /submissions/:id', () => {
    it('存在する入稿の詳細を表示する', async () => {
      // テストデータを作成（書籍・印刷所・入稿）
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト同人誌',
          subtitle: 'サブタイトル',
          description: 'テスト用の同人誌です',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
          websiteUrl: 'https://test-printing.com',
          notes: 'テスト用印刷所',
        })
        .returning()

      const submissionDate = new Date('2024-01-15')
      const expectedDeliveryDate = new Date('2024-01-25')

      const [submission] = await drizzleService.db
        .insert(schema.submissions)
        .values({
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          submissionDate,
          expectedDeliveryDate,
          quantity: 100,
          specificationNotes: 'A5サイズ、表紙カラー',
          printingCost: 50000,
          shippingCost: 3000,
          otherCost: 2000,
          totalCost: 55000,
          discountType: '早期割引',
          deliveryDestination: '東京都渋谷区',
          deliveryNotes: '午前中指定',
          submissionFileNotes: 'PDF入稿',
          generalNotes: '初回取引',
        })
        .returning()

      // 詳細画面にアクセス
      const response = await request(app.getHttpServer())
        .get(`/submissions/${submission.id}`)
        .expect(200)

      // HTMLの内容を確認
      expect(response.text).toContain('入稿詳細')
      expect(response.text).toContain('テスト同人誌')
      expect(response.text).toContain('サブタイトル')
      expect(response.text).toContain('テスト印刷所')
      expect(response.text).toContain('入稿済み') // ステータスの日本語変換
      expect(response.text).toContain('100部')
      expect(response.text).toContain('50,000円') // 金額フォーマット
      expect(response.text).toContain('55,000円') // 合計金額
      expect(response.text).toContain('A5サイズ、表紙カラー')
      expect(response.text).toContain('東京都渋谷区')
      expect(response.text).toContain('PDF入稿')
      expect(response.text).toContain('初回取引')
    })

    it('存在しない入稿IDの場合、404エラーを返す', async () => {
      const nonExistentId = 99999

      await request(app.getHttpServer())
        .get(`/submissions/${nonExistentId}`)
        .expect(404)
    })

    it('不正な入稿IDの場合、400エラーを返す', async () => {
      await request(app.getHttpServer())
        .get('/submissions/invalid-id')
        .expect(400) // ParseIntPipeが400を返す
    })

    it('全フィールドが空の場合でも詳細を表示する', async () => {
      // 最小限のデータで入稿を作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'ミニマム同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'ミニマム印刷所',
        })
        .returning()

      const [submission] = await drizzleService.db
        .insert(schema.submissions)
        .values({
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          quantity: 50,
          status: 'draft',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/submissions/${submission.id}`)
        .expect(200)

      // 基本情報は表示される
      expect(response.text).toContain('ミニマム同人誌')
      expect(response.text).toContain('ミニマム印刷所')
      expect(response.text).toContain('50部')
      expect(response.text).toContain('準備中') // draft -> 準備中

      // 空フィールドは適切に処理される
      expect(response.text).toContain('-') // 空のフィールドは「-」で表示
    })

    it('日付フィールドが正しくフォーマットされる', async () => {
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: '日付テスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: '日付テスト印刷所',
        })
        .returning()

      const submissionDate = new Date('2024-03-15')
      const expectedDeliveryDate = new Date('2024-03-25')
      const actualDeliveryDate = new Date('2024-03-26')

      const [submission] = await drizzleService.db
        .insert(schema.submissions)
        .values({
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          quantity: 75,
          status: 'delivered',
          submissionDate,
          expectedDeliveryDate,
          actualDeliveryDate,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/submissions/${submission.id}`)
        .expect(200)

      // 日付が日本語フォーマットで表示される
      expect(response.text).toContain('2024/3/15')
      expect(response.text).toContain('2024/3/25')
      expect(response.text).toContain('2024/3/26')
      expect(response.text).toContain('納品済み')
    })
  })
})
