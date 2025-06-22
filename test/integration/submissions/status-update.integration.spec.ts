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

describe('Submissions Status Update (Integration)', () => {
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

  describe('GET /submissions/:id/status/edit', () => {
    it('既存の入稿のステータス変更フォームを表示すること', async () => {
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
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/submissions/${testSubmission.id}/status/edit`)
        .expect(200)

      expect(response.text).toContain('ステータス変更')
      expect(response.text).toContain(testBook.title)
      expect(response.text).toContain('value="submitted" selected')
      expect(response.text).toContain('name="_method" value="PUT"')
      expect(response.text).toContain('<option value="draft"')
      expect(response.text).toContain('<option value="submitted"')
      expect(response.text).toContain('<option value="printing"')
      expect(response.text).toContain('<option value="delivered"')
      expect(response.text).toContain('<option value="cancelled"')
    })

    it('存在しない入稿の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/submissions/999999/status/edit')
        .expect(404)
    })
  })

  describe('PUT /submissions/:id/status', () => {
    it('入稿のステータスを正常に更新すること', async () => {
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
          status: 'draft',
          quantity: 100,
        })
        .returning()

      const updateData = {
        status: 'submitted',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}/status`)
        .send(updateData)
        .expect(302)
        .expect('Location', `/submissions/${testSubmission.id}`)

      // 更新されたデータを確認
      const [updatedSubmission] = await drizzleService.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, testSubmission.id))

      expect(updatedSubmission.status).toBe('submitted')
    })
  })
})
