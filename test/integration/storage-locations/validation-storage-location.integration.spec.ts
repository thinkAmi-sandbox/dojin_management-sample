import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('保管場所バリデーション（Integration）', () => {
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
    await testDbUtils.cleanupDatabase()
  })

  describe('POST /storage-locations バリデーションエラー', () => {
    it('保管場所名が空の場合にバリデーションエラーになる', async () => {
      const storageLocationData = {
        name: '',
        type: 'home',
        isConsignment: false,
      }

      const response = await request(app.getHttpServer())
        .post('/storage-locations')
        .send(storageLocationData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // エラーメッセージが含まれることを確認
      expect(response.text).toContain('保管場所名は必須です')
    })

    it('保管場所タイプが無効な値の場合にバリデーションエラーになる', async () => {
      const storageLocationData = {
        name: 'テスト保管場所',
        type: 'invalid-type',
        isConsignment: false,
      }

      const response = await request(app.getHttpServer())
        .post('/storage-locations')
        .send(storageLocationData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      // エラーメッセージが含まれることを確認
      expect(response.text).toContain(
        '保管場所タイプは有効な値を選択してください',
      )
    })

    it('必須項目がすべて正しく設定されている場合、正常に作成される', async () => {
      const storageLocationData = {
        name: 'バリデーションテスト保管場所',
        type: 'warehouse',
        isConsignment: true,
        address: '北海道札幌市テスト1-2-3',
        notes: 'バリデーションテスト用の備考',
      }

      const response = await request(app.getHttpServer())
        .post('/storage-locations')
        .send(storageLocationData)
        .expect(302) // 正常作成でリダイレクト

      // 保管場所一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/storage-locations')

      // 一覧ページで作成した保管場所が表示されることを確認
      const listResponse = await request(app.getHttpServer())
        .get('/storage-locations')
        .expect(200)

      expect(listResponse.text).toContain('バリデーションテスト保管場所')
      expect(listResponse.text).toContain('倉庫')
      expect(listResponse.text).toContain('北海道札幌市テスト1-2-3')
      expect(listResponse.text).toContain('バリデーションテスト用の備考')
    })
  })
})
