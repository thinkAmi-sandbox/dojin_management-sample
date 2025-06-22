import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Exhibits Integration Tests', () => {
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
  describe('GET /exhibits', () => {
    it('出展申込データが存在する場合、一覧を表示する', async () => {
      // テスト用のイベントとサークルを作成
      const [event] = await drizzleService.db
        .insert(schema.events)
        .values({
          name: '技術書典17',
          eventDate: '2024-12-07',
          venue: '東京ビッグサイト',
          applicationStartDate: '2024-09-01',
          applicationEndDate: '2024-09-30',
          description: '技術同人誌の祭典',
        })
        .returning()

      const [circle] = await drizzleService.db
        .insert(schema.circles)
        .values({
          name: 'テックサークル',
          representativeName: '山田太郎',
          email: 'yamada@example.com',
          description: '技術系同人誌を頒布するサークルです',
        })
        .returning()

      // 出展申込データを作成
      await drizzleService.db.insert(schema.exhibits).values([
        {
          eventId: event.id,
          circleId: circle.id,
          status: 'applied',
          spaceNumber: 'A-01',
          spaceType: '一般',
          applicationNotes: '初回申込です',
        },
        {
          eventId: event.id,
          circleId: circle.id,
          status: 'accepted',
          spaceNumber: 'B-02',
          spaceType: '企業',
          applicationNotes: '継続申込です',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/exhibits')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>出展申込一覧</title>')

      // 出展申込データの表示を確認（JOIN処理結果）
      expect(response.text).toContain('技術書典17')
      expect(response.text).toContain('テックサークル')
      expect(response.text).toContain('A-01')
      expect(response.text).toContain('B-02')

      // ページの主要要素を確認
      expect(response.text).toContain('出展申込一覧')
      expect(response.text).toContain('新規申込')
    })

    it('出展申込データが存在しない場合、空リストメッセージを表示する', async () => {
      // データなしでリクエスト実行
      const response = await request(app.getHttpServer())
        .get('/exhibits')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>出展申込一覧</title>')

      // 空リストメッセージを確認
      expect(response.text).toContain('出展申込が登録されていません')
      expect(response.text).toContain('新規申込')
    })
  })
})
