import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('印刷所編集機能 (Integration)', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testCompany: schema.PrintingCompany

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

  beforeEach(async () => {
    // テスト用データの作成
    const result = await drizzleService.db
      .insert(schema.printingCompanies)
      .values({
        name: '既存印刷所',
        websiteUrl: 'https://existing.example.com',
        notes: '既存の備考情報',
      })
      .returning()
    testCompany = result[0]
  })

  describe('GET /printing-companies/:id/edit', () => {
    it('既存印刷所の編集フォームを表示する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/printing-companies/${testCompany.id}/edit`)
        .expect(200)

      const html = response.text

      // タイトルとパンくずリスト
      expect(html).toContain('<title>印刷所編集</title>')
      expect(html).toContain('<h1>印刷所編集</h1>')
      expect(html).toContain('<a href="/printing-companies">印刷所一覧</a>')
      expect(html).toContain(
        `<a href="/printing-companies/${testCompany.id}">既存印刷所</a>`,
      )
      expect(html).toContain('編集')

      // フォームの内容確認
      expect(html).toContain(`action="/printing-companies/${testCompany.id}"`)
      expect(html).toContain('name="_method" value="PUT"')
      expect(html).toContain(`value="既存印刷所"`)
      expect(html).toContain(`value="https://existing.example.com"`)
      expect(html).toContain(`>既存の備考情報</textarea>`)

      // 送信ボタンとキャンセルリンク
      expect(html).toContain('更新する')
      expect(html).toContain(`href="/printing-companies/${testCompany.id}"`)
      expect(html).toContain('キャンセル')
    })

    it('存在しない印刷所IDの場合、404エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/9999/edit')
        .expect(404)

      expect(response.body.message).toContain('印刷所ID 9999 が見つかりません')
    })

    it('無効な印刷所IDの場合、400エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/invalid/edit')
        .expect(400)

      expect(response.body.message).toContain(
        'Validation failed (numeric string is expected)',
      )
    })
  })

  describe('PUT /printing-companies/:id (via POST with _method=PUT)', () => {
    it('有効なデータで印刷所を更新し、詳細ページにリダイレクトする', async () => {
      const updateData = {
        _method: 'PUT',
        name: '更新された印刷所',
        website: 'https://updated.example.com',
        notes: '更新された備考',
      }

      const response = await request(app.getHttpServer())
        .post(`/printing-companies/${testCompany.id}`)
        .type('form')
        .send(updateData)
        .expect(302)

      expect(response.headers.location).toBe(
        `/printing-companies/${testCompany.id}`,
      )

      // データベースの更新確認
      const updated = await drizzleService.db
        .select()
        .from(schema.printingCompanies)
        .where(eq(schema.printingCompanies.id, testCompany.id))

      expect(updated[0].name).toBe('更新された印刷所')
      expect(updated[0].websiteUrl).toBe('https://updated.example.com')
      expect(updated[0].notes).toBe('更新された備考')
    })

    it('印刷所名が空の場合、エラーを表示して編集フォームを再表示する', async () => {
      const updateData = {
        _method: 'PUT',
        name: '',
        website: 'https://example.com',
        notes: '備考',
      }

      const response = await request(app.getHttpServer())
        .post(`/printing-companies/${testCompany.id}`)
        .type('form')
        .send(updateData)
        .expect(200)

      const html = response.text

      // エラーメッセージの確認
      expect(html).toContain('印刷所名は必須です')

      // 入力値が保持されている
      expect(html).toContain('value=""') // name
      expect(html).toContain('value="https://example.com"')
      expect(html).toContain('>備考</textarea>')
    })

    it('websiteに不正なURL形式を指定した場合、エラーを表示する', async () => {
      const updateData = {
        _method: 'PUT',
        name: '印刷所',
        website: 'invalid-url',
        notes: '',
      }

      const response = await request(app.getHttpServer())
        .post(`/printing-companies/${testCompany.id}`)
        .type('form')
        .send(updateData)
        .expect(200)

      const html = response.text

      // エラーメッセージの確認
      expect(html).toContain('有効なURLを入力してください')

      // 入力値が保持されている
      expect(html).toContain('value="印刷所"')
      expect(html).toContain('value="invalid-url"')
    })

    it('websiteとnotesを空にして更新できる', async () => {
      const updateData = {
        _method: 'PUT',
        name: 'シンプル印刷所',
        website: '',
        notes: '',
      }

      const response = await request(app.getHttpServer())
        .post(`/printing-companies/${testCompany.id}`)
        .type('form')
        .send(updateData)
        .expect(302)

      // データベースの更新確認
      const updated = await drizzleService.db
        .select()
        .from(schema.printingCompanies)
        .where(eq(schema.printingCompanies.id, testCompany.id))

      expect(updated[0].name).toBe('シンプル印刷所')
      expect(updated[0].websiteUrl).toBeNull()
      expect(updated[0].notes).toBeNull()
    })

    it('存在しない印刷所IDの場合、404エラーを返す', async () => {
      const updateData = {
        _method: 'PUT',
        name: '更新データ',
        website: '',
        notes: '',
      }

      const response = await request(app.getHttpServer())
        .post('/printing-companies/9999')
        .type('form')
        .send(updateData)
        .expect(404)

      expect(response.body.message).toContain('印刷所ID 9999 が見つかりません')
    })
  })
})

// Drizzleのeq関数をインポート
import { eq } from 'drizzle-orm'
