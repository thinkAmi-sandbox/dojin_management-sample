import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('POST /storage-locations（新規保管場所登録）', () => {
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

  beforeEach(async () => {
    // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /storage-locations/new（新規登録フォーム表示）', () => {
    it('新規登録フォームを正常に表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage-locations/new')
        .expect(200)

      // HTMLの基本構造をチェック
      expect(response.text).toContain('<form')
      expect(response.text).toContain('action="/storage-locations"')
      expect(response.text).toContain('method="POST"')

      // 各入力フィールドをチェック
      expect(response.text).toContain('name="name"')
      expect(response.text).toContain('name="type"')
      expect(response.text).toContain('name="isConsignment"')
      expect(response.text).toContain('name="address"')
      expect(response.text).toContain('name="contactInfo"')
      expect(response.text).toContain('name="notes"')

      // 必須フィールドのマーク
      expect(response.text).toContain('required')

      // typeのオプション（enum値）をチェック
      expect(response.text).toContain('value="home"')
      expect(response.text).toContain('value="warehouse"')
      expect(response.text).toContain('value="consignment"')
      expect(response.text).toContain('value="event"')

      // ボタンの存在確認
      expect(response.text).toContain('登録')
      expect(response.text).toContain('戻る')
    })
  })

  describe('POST /storage-locations（登録処理）', () => {
    it('有効なデータで保管場所を正常に登録できる', async () => {
      const storageLocationData = {
        name: 'テスト保管場所',
        type: 'home',
        isConsignment: false,
        address: '東京都渋谷区テスト1-2-3',
        contactInfo: 'test@example.com',
        notes: 'テスト用の保管場所です',
      }

      const response = await request(app.getHttpServer())
        .post('/storage-locations')
        .send(storageLocationData)
        .expect(302) // リダイレクト

      // 保管場所一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/storage-locations')
    })
  })
})
