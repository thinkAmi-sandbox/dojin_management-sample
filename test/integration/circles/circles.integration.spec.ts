import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Circles Integration Tests', () => {
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
  describe('GET /circles', () => {
    it('サークルデータが存在する場合、一覧を表示する', async () => {
      // テストデータを作成
      await drizzleService.db.insert(schema.circles).values([
        {
          name: 'テックサークル',
          representativeName: '山田太郎',
          email: 'yamada@example.com',
          description: '技術系同人誌を頒布するサークルです',
        },
        {
          name: 'プログラミング部',
          representativeName: '佐藤花子',
          email: 'sato@example.com',
          description: 'プログラミング関連の書籍を制作しています',
        },
      ])

      // リクエスト実行
      const response = await request(app.getHttpServer())
        .get('/circles')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>サークル一覧</title>')

      // サークルデータの表示を確認
      expect(response.text).toContain('テックサークル')
      expect(response.text).toContain('プログラミング部')
      expect(response.text).toContain('山田太郎')
      expect(response.text).toContain('佐藤花子')
      expect(response.text).toContain('yamada@example.com')

      // ページの主要要素を確認
      expect(response.text).toContain('サークル一覧')
      expect(response.text).toContain('新規登録')
    })

    it('サークルデータが存在しない場合、空リストメッセージを表示する', async () => {
      // データなしでリクエスト実行
      const response = await request(app.getHttpServer())
        .get('/circles')
        .expect(200)
        .expect('Content-Type', /html/)

      // HTMLの基本構造を確認
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toContain('<html')
      expect(response.text).toContain('<title>サークル一覧</title>')

      // 空リストメッセージを確認（グローバルナビゲーション実装により部分文字列で検証）
      expect(response.text).toContain('サークルが登録されていません')
      expect(response.text).toContain('新規登録')
    })
  })
})
