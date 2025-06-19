import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('DELETE /printing-companies/:id（印刷所削除）', () => {
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

  describe('DELETE /printing-companies/:id', () => {
    describe('正常系', () => {
      it('印刷所を削除し、一覧画面にリダイレクトする', async () => {
        // テストデータ作成
        const [company] = await drizzleService.db
          .insert(schema.printingCompanies)
          .values({
            name: '削除テスト印刷所',
            websiteUrl: 'https://delete-test.example.com',
            notes: '削除されるデータ',
          })
          .returning()

        // 削除実行
        const response = await request(app.getHttpServer())
          .post(`/printing-companies/${company.id}`)
          .send({ _method: 'DELETE' })

        // リダイレクトの確認
        expect(response.status).toBe(302)
        expect(response.headers.location).toBe('/printing-companies')

        // データベースから削除されたことを確認
        const deletedCompany = await drizzleService.db
          .select()
          .from(schema.printingCompanies)
          .where(eq(schema.printingCompanies.id, company.id))

        expect(deletedCompany).toHaveLength(0)
      })

      it('複数の印刷所がある場合、指定した印刷所のみを削除する', async () => {
        // テストデータ作成
        const [company1] = await drizzleService.db
          .insert(schema.printingCompanies)
          .values({
            name: '残る印刷所',
            websiteUrl: 'https://remain.example.com',
          })
          .returning()

        const [company2] = await drizzleService.db
          .insert(schema.printingCompanies)
          .values({
            name: '削除される印刷所',
            websiteUrl: 'https://delete.example.com',
          })
          .returning()

        // company2を削除
        await request(app.getHttpServer())
          .post(`/printing-companies/${company2.id}`)
          .send({ _method: 'DELETE' })

        // company1は残っていることを確認
        const remainingCompany = await drizzleService.db
          .select()
          .from(schema.printingCompanies)
          .where(eq(schema.printingCompanies.id, company1.id))

        expect(remainingCompany).toHaveLength(1)
        expect(remainingCompany[0].name).toBe('残る印刷所')

        // company2は削除されたことを確認
        const deletedCompany = await drizzleService.db
          .select()
          .from(schema.printingCompanies)
          .where(eq(schema.printingCompanies.id, company2.id))

        expect(deletedCompany).toHaveLength(0)
      })
    })

    describe('異常系', () => {
      it('存在しない印刷所IDの場合、404エラーを返す', async () => {
        const response = await request(app.getHttpServer())
          .post('/printing-companies/99999')
          .send({ _method: 'DELETE' })

        expect(response.status).toBe(404)
        expect(response.text).toContain('印刷所が見つかりませんでした')
      })

      it('無効なID形式の場合、400エラーを返す', async () => {
        const response = await request(app.getHttpServer())
          .post('/printing-companies/invalid-id')
          .send({ _method: 'DELETE' })

        expect(response.status).toBe(400)
        expect(response.text).toContain('Validation failed')
      })
    })
  })

  describe('DELETE /printing-companies/:id（直接DELETEメソッド）', () => {
    it('DELETEメソッドでも削除できる', async () => {
      // テストデータ作成
      const [company] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'DELETEメソッドテスト',
          websiteUrl: 'https://delete-method.example.com',
        })
        .returning()

      // 直接DELETEメソッドで削除
      const response = await request(app.getHttpServer()).delete(
        `/printing-companies/${company.id}`,
      )

      // リダイレクトの確認
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/printing-companies')

      // データベースから削除されたことを確認
      const deletedCompany = await drizzleService.db
        .select()
        .from(schema.printingCompanies)
        .where(eq(schema.printingCompanies.id, company.id))

      expect(deletedCompany).toHaveLength(0)
    })
  })
})
