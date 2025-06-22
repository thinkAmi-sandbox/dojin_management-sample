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

describe('DELETE /submissions/:id（入稿削除）', () => {
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

  describe('DELETE /submissions/:id', () => {
    describe('正常系', () => {
      it('入稿を削除し、入稿一覧画面にリダイレクトする', async () => {
        // 書籍データ作成
        const [book] = await drizzleService.db
          .insert(schema.books)
          .values({
            title: '削除テスト書籍',
            subtitle: '削除される書籍',
            status: 'planning',
          })
          .returning()

        // 印刷所データ作成
        const [printingCompany] = await drizzleService.db
          .insert(schema.printingCompanies)
          .values({
            name: '削除テスト印刷所',
            websiteUrl: 'https://delete-test.example.com',
          })
          .returning()

        // 入稿データ作成
        const [submission] = await drizzleService.db
          .insert(schema.submissions)
          .values({
            bookId: book.id,
            printingCompanyId: printingCompany.id,
            status: 'draft',
            quantity: 100,
            printingCost: 5000,
            deliveryDestination: '削除テスト会場',
          })
          .returning()

        // 削除実行
        const response = await request(app.getHttpServer())
          .post(`/submissions/${submission.id}`)
          .send({ _method: 'DELETE' })

        // リダイレクトの確認
        expect(response.status).toBe(302)
        expect(response.headers.location).toBe('/submissions')

        // データベースから削除されたことを確認
        const deletedSubmission = await drizzleService.db
          .select()
          .from(schema.submissions)
          .where(eq(schema.submissions.id, submission.id))

        expect(deletedSubmission).toHaveLength(0)
      })
    })

    describe('異常系', () => {
      it('存在しない入稿IDの場合、404エラーを返す', async () => {
        const response = await request(app.getHttpServer())
          .post('/submissions/99999')
          .send({ _method: 'DELETE' })

        expect(response.status).toBe(404)
        expect(response.text).toContain('入稿が見つかりません')
      })
    })
  })
})
