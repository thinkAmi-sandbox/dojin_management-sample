import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import request from 'supertest'
import { AppModule } from '../../../src/app.module'
import { setupTestApp } from '../setup-test-app'
import { testDbUtils } from '../../helpers/db-utils'

describe('POST /printing-companies（新規印刷所登録）', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    await app.init()
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  afterEach(async () => {
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /printing-companies/new（新規登録フォーム表示）', () => {
    it('新規登録フォームを正常に表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/new')
        .expect(200)

      // HTMLの基本構造をチェック
      expect(response.text).toContain('<form')
      expect(response.text).toContain('action="/printing-companies"')
      expect(response.text).toContain('method="POST"')

      // 各入力フィールドをチェック
      expect(response.text).toContain('name="name"')
      expect(response.text).toContain('name="website"')
      expect(response.text).toContain('name="notes"')

      // 必須フィールドのマーク
      expect(response.text).toContain('required')

      // ボタンの存在確認
      expect(response.text).toContain('登録')
      expect(response.text).toContain('戻る')
    })
  })

  describe('POST /printing-companies（登録処理）', () => {
    it('有効なデータで印刷所を正常に登録できる', async () => {
      const printingCompanyData = {
        name: 'テスト印刷所',
        website: 'https://test-printing.com',
        notes: 'テスト用の印刷所です',
      }

      const response = await request(app.getHttpServer())
        .post('/printing-companies')
        .send(printingCompanyData)
        .expect(302) // リダイレクト

      // 印刷所一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/printing-companies')
    })

    it('必須項目（name）のみで印刷所を登録できる', async () => {
      const printingCompanyData = {
        name: '最小限印刷所',
      }

      const response = await request(app.getHttpServer())
        .post('/printing-companies')
        .send(printingCompanyData)
        .expect(302) // リダイレクト

      expect(response.header.location).toBe('/printing-companies')
    })

    it('nameが空の場合にバリデーションエラーになる', async () => {
      const printingCompanyData = {
        name: '',
        website: 'https://test-printing.com',
      }

      const response = await request(app.getHttpServer())
        .post('/printing-companies')
        .send(printingCompanyData)
        .expect(400) // バリデーションエラー

      // エラーメッセージが含まれることを確認
      expect(response.text).toContain('印刷所名は必須です')
    })

    it('無効なURL形式のwebsiteでバリデーションエラーになる', async () => {
      const printingCompanyData = {
        name: 'テスト印刷所',
        website: 'invalid-url',
      }

      const response = await request(app.getHttpServer())
        .post('/printing-companies')
        .send(printingCompanyData)
        .expect(400) // バリデーションエラー

      // エラーメッセージが含まれることを確認
      expect(response.text).toContain('有効なURLを入力してください')
    })

    it('登録後に一覧ページで新しい印刷所が表示される', async () => {
      const printingCompanyData = {
        name: '確認用印刷所',
        website: 'https://confirm-printing.com',
        notes: '登録確認用',
      }

      // 印刷所を登録
      await request(app.getHttpServer())
        .post('/printing-companies')
        .send(printingCompanyData)
        .expect(302)

      // 一覧ページで登録した印刷所が表示されることを確認
      const listResponse = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)

      expect(listResponse.text).toContain('確認用印刷所')
      expect(listResponse.text).toContain('https://confirm-printing.com')
      expect(listResponse.text).toContain('登録確認用')
    })
  })
})
