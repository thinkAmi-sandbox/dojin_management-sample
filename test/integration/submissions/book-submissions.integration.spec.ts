import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Book Submissions Integration Tests', () => {
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

  describe('GET /books/:bookId/submissions', () => {
    it('指定された書籍の入稿履歴を表示する', async () => {
      // テストデータを作成（書籍2冊・印刷所・入稿データ）
      const [book1] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト同人誌1',
          subtitle: 'サブタイトル1',
          description: 'テスト用の同人誌1です',
          status: 'planning',
        })
        .returning()

      const [book2] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'テスト同人誌2',
          subtitle: 'サブタイトル2',
          description: 'テスト用の同人誌2です',
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

      // book1の入稿データを2件作成
      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book1.id,
          printingCompanyId: printingCompany.id,
          status: 'draft',
          quantity: 100,
          specificationNotes: 'B5サイズ、表紙カラー',
          deliveryDestination: 'コミケ会場',
        },
        {
          bookId: book1.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 200,
          specificationNotes: 'A5サイズ、表紙モノクロ',
          deliveryDestination: '自宅',
        },
      ])

      // book2の入稿データを1件作成（これは表示されないはず）
      await drizzleService.db.insert(schema.submissions).values({
        bookId: book2.id,
        printingCompanyId: printingCompany.id,
        status: 'printing',
        quantity: 300,
        deliveryDestination: 'イベント会場',
      })

      // book1の入稿履歴をリクエスト
      const response = await request(app.getHttpServer())
        .get(`/books/${book1.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>')

      // book1の入稿データのみ表示されることを確認
      expect(response.text).toContain('テスト同人誌1')
      expect(response.text).toContain('テスト印刷所')
      expect(response.text).toContain('準備中')
      expect(response.text).toContain('入稿済み')
      expect(response.text).toContain('100部')
      expect(response.text).toContain('200部')

      // book2の入稿データは表示されないことを確認
      expect(response.text).not.toContain('テスト同人誌2')
      expect(response.text).not.toContain('印刷中')
      expect(response.text).not.toContain('300部')
    })

    it('存在しない書籍IDの場合、404エラーを返す', async () => {
      const nonExistentBookId = 99999

      await request(app.getHttpServer())
        .get(`/books/${nonExistentBookId}/submissions`)
        .expect(404)
    })

    it('書籍は存在するが入稿履歴が空の場合、空リストメッセージを表示する', async () => {
      // 書籍のみ作成（入稿データなし）
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: '入稿履歴なし書籍',
          status: 'planning',
        })
        .returning()

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get(`/books/${book.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')

      // 書籍情報は表示される
      expect(response.text).toContain('入稿履歴なし書籍')

      // 空リストメッセージを確認
      expect(response.text).toContain('この書籍の入稿履歴はありません')
    })

    it('入稿履歴が作成日降順でソートされる', async () => {
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

      // 異なる時刻で作成（古い順）
      const oldDate = new Date('2024-01-01')
      const newDate = new Date('2024-12-31')

      await drizzleService.db.insert(schema.submissions).values([
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'draft',
          quantity: 100,
          createdAt: oldDate,
        },
        {
          bookId: book.id,
          printingCompanyId: printingCompany.id,
          status: 'submitted',
          quantity: 200,
          createdAt: newDate,
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get(`/books/${book.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      // 新しい入稿が先に表示されることを確認（HTMLの順序で判定）
      const submittedIndex = response.text.indexOf('入稿済み')
      const draftIndex = response.text.indexOf('準備中')
      expect(submittedIndex).toBeLessThan(draftIndex)
    })

    it('書籍の入稿履歴で詳細・編集リンクが表示される', async () => {
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
        .get(`/books/${book.id}/submissions`)
        .expect(200)
        .expect('Content-Type', /html/)

      // アクションリンクを確認
      expect(response.text).toContain(`/submissions/${submission.id}`)
      expect(response.text).toContain(`/submissions/${submission.id}/edit`)
      expect(response.text).toContain('詳細')
      expect(response.text).toContain('編集')
    })
  })
})
