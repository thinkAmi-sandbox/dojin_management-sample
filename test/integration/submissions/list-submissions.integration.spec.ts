import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Submissions List Integration Tests', () => {
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
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /submissions', () => {
    it('入稿データが存在する場合、一覧を表示する', async () => {
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
          websiteUrl: 'https://www.test-print.com',
        })
        .returning()

      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'draft',
          quantity: 100,
          specificationNotes: 'B5サイズ、表紙カラー',
          deliveryDestination: 'コミケ会場',
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 200,
          specificationNotes: 'A5サイズ、表紙モノクロ',
          deliveryDestination: '自宅',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>入稿一覧</title>')

      // 入稿データの表示を確認
      expect(response.text).toContain('テスト同人誌')
      expect(response.text).toContain('テスト印刷所')
      expect(response.text).toContain('準備中')
      expect(response.text).toContain('入稿済み')
      expect(response.text).toContain('100部')
      expect(response.text).toContain('200部')

      // ページの主要要素を確認
      expect(response.text).toContain('入稿一覧')
      expect(response.text).toContain('書籍一覧から入稿作成')
    })

    it('入稿データが存在しない場合、空リストメッセージを表示する', async () => {
      // データなしでリクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>入稿一覧</title>')

      // 空リストメッセージを確認
      expect(response.text).toContain('入稿データが登録されていません')
      expect(response.text).toContain('書籍一覧から入稿を作成する')
    })

    it('入稿の詳細・編集リンクが表示される', async () => {
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
          status: 'draft',
          quantity: 50,
        })
        .returning()

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // アクションリンクを確認
      expect(response.text).toContain(`/submissions/${submission.id}`)
      expect(response.text).toContain(`/submissions/${submission.id}/edit`)
      expect(response.text).toContain('詳細')
      expect(response.text).toContain('編集')
    })

    it('ステータスが適切に表示される', async () => {
      // テストデータを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'ステータステスト同人誌',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'ステータステスト印刷所',
        })
        .returning()

      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'draft',
          quantity: 100,
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 200,
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'printing',
          quantity: 300,
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'delivered',
          quantity: 400,
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // ステータス表示を確認
      expect(response.text).toContain('準備中')
      expect(response.text).toContain('入稿済み')
      expect(response.text).toContain('印刷中')
      expect(response.text).toContain('納品済み')
    })

    it('書籍と印刷所の情報が結合して表示される', async () => {
      // テストデータを作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: '結合テスト同人誌',
          subtitle: '結合テストのサブタイトル',
          status: 'planning',
        })
        .returning()

      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: '結合テスト印刷所',
          websiteUrl: 'https://www.join-test.com',
        })
        .returning()

      await drizzleService.db.insert(schema.submissions).values({
        bookId: book.id,
        printingCompanyId: printingCompany.id,
        status: 'submitted',
        quantity: 500,
        deliveryDestination: 'イベント会場',
      })

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .expect(200)
        .expect('Content-Type', /html/)

      // 結合データの表示を確認
      expect(response.text).toContain('結合テスト同人誌')
      expect(response.text).toContain('結合テスト印刷所')
      expect(response.text).toContain('500部')
      expect(response.text).toContain('イベント会場')
    })
  })
})
