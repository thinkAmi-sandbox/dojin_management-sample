import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Printing Companies List Integration Tests', () => {
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

  describe('GET /printing-companies', () => {
    it('印刷所データが存在する場合、一覧を表示する', async () => {
      // テストデータを作成
      await drizzleService.db.insert(schema.printingCompanies).values([
        {
          name: 'サンライズパブリケーション',
          websiteUrl: 'https://www.sunrise-pub.co.jp',
          notes: '同人誌印刷専門。対応が丁寧で初心者にも優しい。',
        },
        {
          name: 'ドリームプリント',
          websiteUrl: 'https://www.dream-print.com',
          notes: '早割サービスが充実している。',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>印刷所一覧</title>')

      // 印刷所データの表示を確認
      expect(response.text).toContain('サンライズパブリケーション')
      expect(response.text).toContain('ドリームプリント')
      expect(response.text).toContain('https://www.sunrise-pub.co.jp')
      expect(response.text).toContain('https://www.dream-print.com')
      expect(response.text).toContain('同人誌印刷専門')
      expect(response.text).toContain('早割サービス')

      // ページの主要要素を確認
      expect(response.text).toContain('印刷所一覧')
      expect(response.text).toContain('新規登録')
    })

    it('印刷所データが存在しない場合、空リストメッセージを表示する', async () => {
      // データなしでリクエスト実行
      const response = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>印刷所一覧</title>')

      // 空リストメッセージを確認
      expect(response.text).toContain('印刷所が登録されていません')
      expect(response.text).toContain('新規登録')
    })

    it('印刷所の詳細・編集リンクが表示される', async () => {
      // テストデータを作成
      const [printingCompany] = await drizzleService.db
        .insert(schema.printingCompanies)
        .values({
          name: 'テスト印刷所',
          websiteUrl: 'https://www.test-print.com',
          notes: 'テスト用の印刷所です。',
        })
        .returning()

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      // アクションリンクを確認
      expect(response.text).toContain(
        `/printing-companies/${printingCompany.id}`,
      )
      expect(response.text).toContain(
        `/printing-companies/${printingCompany.id}/edit`,
      )
      expect(response.text).toContain('詳細')
      expect(response.text).toContain('編集')
    })

    it('公式サイトURLがリンクとして表示される', async () => {
      // テストデータを作成
      await drizzleService.db.insert(schema.printingCompanies).values({
        name: 'リンクテスト印刷所',
        websiteUrl: 'https://www.example.com',
        notes: 'URLリンクのテスト',
      })

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/printing-companies')
        .expect(200)
        .expect('Content-Type', /html/)

      // URLがリンクとして表示されることを確認
      expect(response.text).toContain('<a href="https://www.example.com"')
      expect(response.text).toContain('target="_blank"')
    })
  })
})
