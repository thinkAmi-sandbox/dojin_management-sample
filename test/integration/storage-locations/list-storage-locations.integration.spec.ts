import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('GET /storage-locations（保管場所一覧）', () => {
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
    await testDbUtils.cleanupDatabase()
  })

  describe('保管場所一覧表示', () => {
    it('保管場所が登録されていない場合、空の一覧を表示する', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage-locations')
        .expect(200)

      // タイトルとヘッダー
      expect(response.text).toContain('<title>保管場所一覧</title>')
      expect(response.text).toContain('<h1>保管場所一覧</h1>')

      // 新規作成リンク
      expect(response.text).toContain('<a href="/storage-locations/new"')
      expect(response.text).toContain('新規作成')

      // 保管場所がない場合のメッセージ
      expect(response.text).toContain('保管場所が登録されていません')
    })

    it('登録済み保管場所一覧を正常に表示する', async () => {
      // テストデータ作成
      await drizzleService.db.insert(schema.storageLocations).values([
        {
          name: '自宅保管庫',
          type: 'home',
          isConsignment: false,
          address: '東京都渋谷区1-2-3',
          contactInfo: 'home@example.com',
          notes: '自宅の保管場所',
        },
        {
          name: '委託先倉庫',
          type: 'consignment',
          isConsignment: true,
          address: '大阪府大阪市4-5-6',
          contactInfo: 'consignment@example.com',
          notes: '委託販売用の倉庫',
        },
      ])

      const response = await request(app.getHttpServer())
        .get('/storage-locations')
        .expect(200)

      // 各保管場所の情報が表示されることを確認
      expect(response.text).toContain('自宅保管庫')
      expect(response.text).toContain('委託先倉庫')
      expect(response.text).toContain('自宅')
      expect(response.text).toContain('委託販売')
      expect(response.text).toContain('東京都渋谷区1-2-3')
      expect(response.text).toContain('大阪府大阪市4-5-6')

      // 詳細・編集・削除のリンクが存在することを確認
      expect(response.text).toContain('詳細')
      expect(response.text).toContain('編集')
      expect(response.text).toContain('削除')
    })
  })
})
