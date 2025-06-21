import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Submissions Costs (Integration)', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    setupTestApp(app)
    await app.init()

    drizzleService = moduleFixture.get<DrizzleService>(DrizzleService)
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(async () => {
    // データクリーンアップ
    await drizzleService.db.delete(schema.submissions)
    await drizzleService.db.delete(schema.books)
    await drizzleService.db.delete(schema.printingCompanies)
  })

  describe('GET /submissions/costs', () => {
    it('入稿コスト集計画面を正常に表示', async () => {
      // テストデータ作成
      const [testBook1] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍1',
          pageCount: 100,
          status: 'completed',
        })
        .returning()

      const [testBook2] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍2',
          pageCount: 200,
          status: 'completed',
        })
        .returning()

      const [testPrintingCompany1] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所A',
        })
        .returning()

      const [testPrintingCompany2] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所B',
        })
        .returning()

      // 複数の入稿データ作成（異なる印刷所・書籍・コスト）
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: testBook1.id,
          printingCompanyId: testPrintingCompany1.id,
          status: 'delivered',
          quantity: 100,
          printingCost: 50000,
          shippingCost: 3000,
          otherCost: 2000,
          totalCost: 55000,
          submissionDate: new Date('2024-01-15'),
          actualDeliveryDate: new Date('2024-01-20'),
        },
        {
          bookId: testBook1.id,
          printingCompanyId: testPrintingCompany2.id,
          status: 'delivered',
          quantity: 200,
          printingCost: 80000,
          shippingCost: 5000,
          otherCost: 0,
          totalCost: 85000,
          submissionDate: new Date('2024-02-10'),
          actualDeliveryDate: new Date('2024-02-15'),
        },
        {
          bookId: testBook2.id,
          printingCompanyId: testPrintingCompany1.id,
          status: 'delivered',
          quantity: 150,
          printingCost: 60000,
          shippingCost: 4000,
          otherCost: 1000,
          totalCost: 65000,
          submissionDate: new Date('2024-03-05'),
          actualDeliveryDate: new Date('2024-03-10'),
        },
      ])

      const response = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)

      // 基本要素の確認
      expect(response.text).toContain('入稿コスト集計')
      expect(response.text).toContain('印刷所別集計')
      expect(response.text).toContain('書籍別集計')
      expect(response.text).toContain('期間別集計')

      // 印刷所別集計の確認
      expect(response.text).toContain('テスト印刷所A')
      expect(response.text).toContain('テスト印刷所B')

      // 書籍別集計の確認
      expect(response.text).toContain('テスト書籍1')
      expect(response.text).toContain('テスト書籍2')

      // 各項目が表示されていることを確認
      expect(response.text).toContain('55,000円')
      expect(response.text).toContain('85,000円')
      expect(response.text).toContain('65,000円')
    })

    it('データがない場合は空の集計画面を表示', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)

      expect(response.text).toContain('入稿コスト集計')
      expect(response.text).toContain('集計データがありません')
    })

    it('フィルタリング（期間指定）が機能する', async () => {
      // テストデータ作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          pageCount: 100,
          status: 'completed',
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
        })
        .returning()

      // 異なる期間の入稿データ作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 100,
          totalCost: 50000,
          submissionDate: new Date('2024-01-15'),
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 100,
          totalCost: 60000,
          submissionDate: new Date('2024-02-15'),
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 100,
          totalCost: 70000,
          submissionDate: new Date('2024-03-15'),
        },
      ])

      // 2024年2月のみでフィルタリング
      const response = await request(app.getHttpServer())
        .get('/submissions/costs?startDate=2024-02-01&endDate=2024-02-28')
        .expect(200)

      expect(response.text).toContain('入稿コスト集計')
      expect(response.text).toContain('期間: 2024-02-01 〜 2024-02-28')
      expect(response.text).toContain('60,000円')
      expect(response.text).not.toContain('50,000円')
      expect(response.text).not.toContain('70,000円')
    })

    it('フィルタリング（ステータス指定）が機能する', async () => {
      // テストデータ作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          pageCount: 100,
          status: 'completed',
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
        })
        .returning()

      // 異なるステータスの入稿データ作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 100,
          totalCost: 50000,
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'printing',
          quantity: 100,
          totalCost: 60000,
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'cancelled',
          quantity: 100,
          totalCost: 70000,
        },
      ])

      // deliveredステータスのみでフィルタリング
      const response = await request(app.getHttpServer())
        .get('/submissions/costs?status=delivered')
        .expect(200)

      expect(response.text).toContain('入稿コスト集計')
      expect(response.text).toContain('ステータス: 納品済み')
      expect(response.text).toContain('50,000円')
      expect(response.text).not.toContain('60,000円')
      expect(response.text).not.toContain('70,000円')
    })

    it('統計情報（平均・最大・最小）を正しく表示', async () => {
      // テストデータ作成
      const [testBook] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト書籍',
          pageCount: 100,
          status: 'completed',
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
        })
        .returning()

      // 複数の入稿データ作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 100,
          totalCost: 30000, // 最小
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 200,
          totalCost: 50000, // 中間
        },
        {
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'delivered',
          quantity: 300,
          totalCost: 100000, // 最大
        },
      ])

      const response = await request(app.getHttpServer())
        .get('/submissions/costs')
        .expect(200)

      expect(response.text).toContain('統計情報')
      expect(response.text).toContain('60,000円')
      expect(response.text).toContain('100,000円')
      expect(response.text).toContain('30,000円')
      expect(response.text).toContain('180,000円')
    })
  })
})
