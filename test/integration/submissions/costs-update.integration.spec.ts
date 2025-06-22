import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books, printingCompanies, submissions } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Submissions Costs Update (Integration)', () => {
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
    // 各テスト前に全データをクリーンアップ（統一済みパターン）
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /submissions/:id/costs/edit', () => {
    it('既存の入稿のコスト情報変更フォームを表示すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
          subtitle: 'テストサブタイトル',
          description: 'テスト説明',
          pageCount: 100,
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(printingCompanies)
        .values({
          name: 'テスト印刷所',
          websiteUrl: 'https://example.com',
          notes: 'テスト用印刷所',
        })
        .returning()

      const [testSubmission] = await drizzleService.db
        .insert(submissions)
        .values({
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'submitted',
          quantity: 100,
          printingCost: 50000,
          shippingCost: 1000,
          otherCost: 500,
          totalCost: 51500,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/submissions/${testSubmission.id}/costs/edit`)
        .expect(200)

      expect(response.text).toContain('コスト情報変更')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('value="50000"')
      expect(response.text).toContain('value="1000"')
      expect(response.text).toContain('value="500"')
      expect(response.text).toContain('name="_method" value="PUT"')
      expect(response.text).toContain('name="printingCost"')
      expect(response.text).toContain('name="shippingCost"')
      expect(response.text).toContain('name="otherCost"')
    })

    it('存在しない入稿の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/submissions/999999/costs/edit')
        .expect(404)
    })
  })

  describe('PUT /submissions/:id/costs', () => {
    it('入稿のコスト情報を正常に更新すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍',
        })
        .returning()

      const [testPrintingCompany] = await drizzleService.db
        .insert(printingCompanies)
        .values({
          name: 'テスト印刷所',
        })
        .returning()

      const [testSubmission] = await drizzleService.db
        .insert(submissions)
        .values({
          bookId: testBook.id,
          printingCompanyId: testPrintingCompany.id,
          status: 'submitted',
          quantity: 100,
          printingCost: 30000,
          shippingCost: 500,
          otherCost: 0,
          totalCost: 30500,
        })
        .returning()

      const updateData = {
        printingCost: '60000',
        shippingCost: '1500',
        otherCost: '1000',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}/costs`)
        .send(updateData)
        .expect(302)
        .expect('Location', `/submissions/${testSubmission.id}`)

      // 更新されたデータを確認
      const [updatedSubmission] = await drizzleService.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, testSubmission.id))

      expect(updatedSubmission.printingCost).toBe(60000)
      expect(updatedSubmission.shippingCost).toBe(1500)
      expect(updatedSubmission.otherCost).toBe(1000)
      expect(updatedSubmission.totalCost).toBe(62500) // 自動計算
    })
  })
})
