import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('保管場所CRUD機能（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testStorageLocation: schema.StorageLocation

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
    await testDbUtils.cleanupDatabase()

    // テスト用データの作成
    const result = await drizzleService.db
      .insert(schema.storageLocations)
      .values({
        name: '既存保管場所',
        type: 'home',
        isConsignment: false,
        address: '東京都渋谷区テスト1-2-3',
        contactInfo: 'test@example.com',
        notes: '既存の備考情報',
      })
      .returning()
    testStorageLocation = result[0]
  })

  describe('GET /storage-locations/:id', () => {
    it('既存保管場所の詳細を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage-locations/${testStorageLocation.id}`)
        .expect(200)

      const html = response.text

      // タイトルとヘッダー
      expect(html).toContain('<title>保管場所詳細</title>')
      expect(html).toContain('<h1>保管場所詳細</h1>')

      // 詳細情報の確認
      expect(html).toContain('既存保管場所')
      expect(html).toContain('自宅')
      expect(html).toContain('いいえ')
      expect(html).toContain('東京都渋谷区テスト1-2-3')
      expect(html).toContain('test@example.com')
      expect(html).toContain('既存の備考情報')

      // アクションリンク
      expect(html).toContain(
        `href="/storage-locations/${testStorageLocation.id}/edit"`,
      )
      expect(html).toContain('編集')
      expect(html).toContain('削除')
      expect(html).toContain('一覧に戻る')
    })

    it('存在しない保管場所IDの場合、404エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage-locations/9999')
        .expect(404)

      expect(response.body.message).toContain(
        '保管場所ID 9999 が見つかりません',
      )
    })
  })

  describe('GET /storage-locations/:id/edit', () => {
    it('既存保管場所の編集フォームを表示する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage-locations/${testStorageLocation.id}/edit`)
        .expect(200)

      const html = response.text

      // タイトルとヘッダー
      expect(html).toContain('<title>保管場所編集</title>')
      expect(html).toContain('<h1>保管場所編集</h1>')

      // フォームの内容確認
      expect(html).toContain(
        `action="/storage-locations/${testStorageLocation.id}"`,
      )
      expect(html).toContain('name="_method" value="PUT"')
      expect(html).toContain(`value="既存保管場所"`)
      expect(html).toContain(`value="東京都渋谷区テスト1-2-3"`)
      expect(html).toContain(`>既存の備考情報</textarea>`)

      // タイプのオプション
      expect(html).toContain('value="home" selected')

      // 送信ボタンとキャンセルリンク
      expect(html).toContain('更新する')
      expect(html).toContain(
        `href="/storage-locations/${testStorageLocation.id}"`,
      )
      expect(html).toContain('キャンセル')
    })

    it('存在しない保管場所IDの場合、404エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage-locations/9999/edit')
        .expect(404)

      expect(response.body.message).toContain(
        '保管場所ID 9999 が見つかりません',
      )
    })
  })

  describe('PUT /storage-locations/:id (HTTPメソッドオーバーライド)', () => {
    it('保管場所情報を正常に更新する', async () => {
      const updateData = {
        _method: 'PUT',
        name: '更新された保管場所',
        type: 'warehouse',
        isConsignment: true,
        address: '大阪府大阪市更新1-2-3',
        contactInfo: 'updated@example.com',
        notes: '更新された備考',
      }

      const response = await request(app.getHttpServer())
        .post(`/storage-locations/${testStorageLocation.id}`)
        .send(updateData)
        .expect(302)

      // 詳細ページにリダイレクトされることを確認
      expect(response.header.location).toBe(
        `/storage-locations/${testStorageLocation.id}`,
      )

      // 更新後の詳細ページで更新内容が反映されていることを確認
      const detailResponse = await request(app.getHttpServer())
        .get(`/storage-locations/${testStorageLocation.id}`)
        .expect(200)

      expect(detailResponse.text).toContain('更新された保管場所')
      expect(detailResponse.text).toContain('倉庫')
      expect(detailResponse.text).toContain('はい')
      expect(detailResponse.text).toContain('大阪府大阪市更新1-2-3')
      expect(detailResponse.text).toContain('updated@example.com')
      expect(detailResponse.text).toContain('更新された備考')
    })

    it('存在しない保管場所IDの場合、404エラーを返す', async () => {
      const updateData = {
        _method: 'PUT',
        name: '更新テスト',
        type: 'home',
        isConsignment: false,
      }

      const response = await request(app.getHttpServer())
        .post('/storage-locations/9999')
        .send(updateData)
        .expect(404)

      expect(response.body.message).toContain(
        '保管場所ID 9999 が見つかりません',
      )
    })
  })

  describe('DELETE /storage-locations/:id (HTTPメソッドオーバーライド)', () => {
    it('保管場所を正常に削除する', async () => {
      const deleteData = {
        _method: 'DELETE',
      }

      const response = await request(app.getHttpServer())
        .post(`/storage-locations/${testStorageLocation.id}`)
        .send(deleteData)
        .expect(302)

      // 一覧ページにリダイレクトされることを確認
      expect(response.header.location).toBe('/storage-locations')

      // 削除後、詳細ページにアクセスすると404になることを確認
      await request(app.getHttpServer())
        .get(`/storage-locations/${testStorageLocation.id}`)
        .expect(404)
    })

    it('存在しない保管場所IDの場合、404エラーを返す', async () => {
      const deleteData = {
        _method: 'DELETE',
      }

      await request(app.getHttpServer())
        .post('/storage-locations/9999')
        .send(deleteData)
        .expect(404)
    })
  })
})
