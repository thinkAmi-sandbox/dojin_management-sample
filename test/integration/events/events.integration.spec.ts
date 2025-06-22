import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Events Integration Tests', () => {
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

  // Phase 1: ミニマム実装テスト（1-2テスト）
  describe('GET /events', () => {
    it('イベントデータが存在する場合、一覧を表示する', async () => {
      // テストデータを作成
      await drizzleService.db.insert(schema.events).values([
        {
          name: '技術書典17',
          eventDate: '2024-12-07',
          venue: '東京ビッグサイト',
          applicationStartDate: '2024-09-01',
          applicationEndDate: '2024-09-30',
          description: '技術同人誌の祭典',
        },
        {
          name: 'コミックマーケット103',
          eventDate: '2024-12-29',
          venue: '東京ビッグサイト',
          applicationStartDate: '2024-08-01',
          applicationEndDate: '2024-08-31',
          description: '世界最大の同人誌即売会',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>イベント一覧</title>')

      // イベントデータの表示を確認
      expect(response.text).toContain('技術書典17')
      expect(response.text).toContain('コミックマーケット103')
      expect(response.text).toContain('東京ビッグサイト')
      expect(response.text).toContain('2024/12/7')
      expect(response.text).toContain('2024/12/29')

      // ページの主要要素を確認
      expect(response.text).toContain('イベント一覧')
      expect(response.text).toContain('新規登録')
    })

    it('イベントデータが存在しない場合、空リストメッセージを表示する', async () => {
      // データなしでリクエスト実行
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>イベント一覧</title>')

      // 空リストメッセージを確認（グローバルナビゲーション実装により部分文字列で検証）
      expect(response.text).toContain('イベントが登録されていません')
      expect(response.text).toContain('新規登録')
    })
  })
})
