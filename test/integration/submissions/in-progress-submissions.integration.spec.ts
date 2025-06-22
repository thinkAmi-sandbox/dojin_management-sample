import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('In-Progress Submissions Integration Tests', () => {
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

  describe('GET /submissions/in-progress', () => {
    it('進行中入稿（入稿済み・印刷中）のみを表示する', async () => {
      // テストデータを作成（書籍・印刷所）
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: '進行中テスト同人誌',
          subtitle: 'サブタイトル',
          description: 'テスト用の同人誌です',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: '進行中テスト印刷所',
          websiteUrl: 'https://www.progress-test.com',
        })
        .returning()

      // 各ステータスの入稿データを作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'draft', // 準備中（表示されない）
          quantity: 100,
          expectedDeliveryDate: new Date('2024-03-10'),
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted', // 入稿済み（表示される）
          quantity: 200,
          expectedDeliveryDate: new Date('2024-03-15'),
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'printing', // 印刷中（表示される）
          quantity: 300,
          expectedDeliveryDate: new Date('2024-03-12'),
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'delivered', // 納品済み（表示されない）
          quantity: 400,
          expectedDeliveryDate: new Date('2024-03-08'),
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'cancelled', // キャンセル（表示されない）
          quantity: 500,
          expectedDeliveryDate: new Date('2024-03-20'),
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>進行中の入稿一覧</title>')

      // 進行中のみ表示（入稿済み・印刷中）
      expect(response.text).toContain('入稿済み')
      expect(response.text).toContain('印刷中')
      expect(response.text).toContain('200部')
      expect(response.text).toContain('300部')

      // その他のステータスは表示されない
      expect(response.text).not.toContain('準備中')
      expect(response.text).not.toContain('納品済み')
      expect(response.text).not.toContain('キャンセル')
      expect(response.text).not.toContain('100部')
      expect(response.text).not.toContain('400部')
      expect(response.text).not.toContain('500部')
    })

    it('納期予定日で昇順ソートされている', async () => {
      // テストデータを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'ソートテスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'ソートテスト印刷所',
        })
        .returning()

      // 納期が異なる進行中入稿を作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 100,
          expectedDeliveryDate: new Date('2024-03-20'), // 後
          deliveryDestination: '後の納期',
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'printing',
          quantity: 200,
          expectedDeliveryDate: new Date('2024-03-10'), // 先
          deliveryDestination: '先の納期',
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 300,
          expectedDeliveryDate: new Date('2024-03-15'), // 中間
          deliveryDestination: '中間の納期',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // 納期順序の確認（先の納期が上に表示される）
      const html = response.text
      const positions = [
        html.indexOf('先の納期'),
        html.indexOf('中間の納期'),
        html.indexOf('後の納期'),
      ]

      // 各位置が見つかり、順番通りに配置されていることを確認
      expect(positions[0]).toBeGreaterThan(0)
      expect(positions[1]).toBeGreaterThan(0)
      expect(positions[2]).toBeGreaterThan(0)
      expect(positions[0]).toBeLessThan(positions[1])
      expect(positions[1]).toBeLessThan(positions[2])
    })

    it('進行中入稿が存在しない場合、空リストメッセージを表示する', async () => {
      // 進行中以外のステータスのみ作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: '空テスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: '空テスト印刷所',
        })
        .returning()

      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'draft', // 準備中
          quantity: 100,
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'delivered', // 納品済み
          quantity: 200,
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<title>進行中の入稿一覧</title>')

      // 空リストメッセージを確認
      expect(response.text).toContain('進行中の入稿がありません')
      expect(response.text).toContain('入稿一覧に戻る')
    })

    it('納期予定日がnullの場合も適切に表示される', async () => {
      // テストデータを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'null納期テスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'null納期テスト印刷所',
        })
        .returning()

      // 納期なしと納期ありの進行中入稿を作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 100,
          expectedDeliveryDate: null, // 納期なし
          deliveryDestination: '納期なし配送先',
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'printing',
          quantity: 200,
          expectedDeliveryDate: new Date('2024-03-15'), // 納期あり
          deliveryDestination: '納期あり配送先',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // 両方の入稿が表示される
      expect(response.text).toContain('納期なし配送先')
      expect(response.text).toContain('納期あり配送先')
      expect(response.text).toContain('100部')
      expect(response.text).toContain('200部')
    })

    it('詳細・編集リンクが適切に表示される', async () => {
      // テストデータを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'リンクテスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'リンクテスト印刷所',
        })
        .returning()

      const [submission] = await drizzleService.db
        .insert(schema.submissions)
        .values({
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 50,
        })
        .returning()

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions/in-progress')
        .expect(200)
        .expect('Content-Type', /html/)

      // アクションリンクを確認
      expect(response.text).toContain(`/submissions/${submission.id}`)
      expect(response.text).toContain(`/submissions/${submission.id}/edit`)
      expect(response.text).toContain('詳細')
      expect(response.text).toContain('編集')
      expect(response.text).toContain('全入稿一覧に戻る')
    })
  })
})
