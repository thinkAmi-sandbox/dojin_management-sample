import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import {
  afterAll,
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

describe('印刷所詳細画面 (GET /printing-companies/:id)', () => {
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


  describe('正常系', () => {
    beforeEach(async () => {
      // テスト用データの作成
      const result = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
          websiteUrl: 'https://test-printing.example.com',
          notes: 'これはテスト用の印刷所です。\n複数行の\n備考情報。',
        })
        .returning()
      testCompany = result[0]
    })

    it('存在する印刷所の詳細情報が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get(`/printing-companies/${testCompany.id}`)
        .expect(200)

      const html = response.text

      // タイトルの確認
      expect(html).toContain('<title>印刷所詳細</title>')
      expect(html).toContain('<h1>印刷所詳細</h1>')

      // パンくずリストの確認
      expect(html).toContain('<a href="/printing-companies">印刷所一覧</a>')
      expect(html).toContain(`テスト印刷所`)

      // 印刷所情報の確認
      expect(html).toContain('<th>印刷所名</th>')
      expect(html).toContain('<td>テスト印刷所</td>')

      // 公式サイトの確認
      expect(html).toContain('<th>公式サイト</th>')
      expect(html).toContain(
        '<a href="https://test-printing.example.com" target="_blank" class="website-link">',
      )
      expect(html).toContain('https://test-printing.example.com')

      // 備考の確認（改行が含まれる）
      expect(html).toContain('<th>備考</th>')
      expect(html).toContain('これはテスト用の印刷所です。')
      expect(html).toContain('複数行の')
      expect(html).toContain('備考情報。')

      // 日付の確認（日本語形式）
      expect(html).toMatch(
        /<th>登録日<\/th>\s*<td>\d{4}\/\d{1,2}\/\d{1,2}<\/td>/,
      )
      expect(html).toMatch(
        /<th>更新日<\/th>\s*<td>\d{4}\/\d{1,2}\/\d{1,2}<\/td>/,
      )

      // アクションボタンの確認
      expect(html).toContain(
        `href="/printing-companies/${testCompany.id}/edit"`,
      )
      expect(html).toContain('編集')
      expect(html).toContain('href="/printing-companies"')
      expect(html).toContain('一覧に戻る')

      // 入稿履歴セクションの確認
      expect(html).toContain('<h3>入稿履歴</h3>')
      expect(html).toContain('入稿機能の実装後に履歴が表示されます。')
    })

    it('公式サイトが未設定の場合は「未設定」と表示される', async () => {
      // 公式サイトなしの印刷所を作成
      const result = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'サイトなし印刷所',
          websiteUrl: null,
          notes: null,
        })
        .returning()
      const companyWithoutWebsite = result[0]

      const response = await request(app.getHttpServer())
        .get(`/printing-companies/${companyWithoutWebsite.id}`)
        .expect(200)

      const html = response.text

      // 公式サイトが未設定と表示される
      expect(html).toContain('<th>公式サイト</th>')
      expect(html).not.toContain('class="website-link"')
      expect(html).toContain('未設定')

      // 備考も「備考なし」と表示される
      expect(html).toContain('備考なし')
    })
  })

  describe('異常系', () => {
    it('存在しない印刷所IDを指定すると404エラーが返される', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/9999')
        .expect(404)

      expect(response.body.message).toContain('印刷所ID 9999 が見つかりません')
    })

    it('不正なID形式（文字列）を指定すると400エラーが返される', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/invalid-id')
        .expect(400)

      expect(response.body.message).toContain(
        'Validation failed (numeric string is expected)',
      )
    })

    it('不正なID形式（小数）を指定すると400エラーが返される', async () => {
      const response = await request(app.getHttpServer())
        .get('/printing-companies/1.5')
        .expect(400)

      expect(response.body.message).toContain(
        'Validation failed (numeric string is expected)',
      )
    })
  })
})
