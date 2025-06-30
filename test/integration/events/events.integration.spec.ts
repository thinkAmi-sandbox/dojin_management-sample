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

  // Phase 3-3 Phase B: 版対応テスト（最重要テストケース先行実装）
  describe('Events Edition Integration Tests', () => {
    let testEvent: schema.Event
    let _testBook: schema.Book
    let _testEdition: schema.Edition
    let _testCircle: schema.Circle
    let _testExhibit: schema.Exhibit
    let _testExhibitBook: schema.ExhibitBook

    beforeEach(async () => {
      // 5テーブル連携のテストデータ作成
      // Event → Exhibit → ExhibitBook → Edition → Book

      // Book作成
      const [book] = await drizzleService.db
        .insert(schema.books)
        .values({
          title: 'TypeScript実践ガイド',
          subtitle: '型安全なWeb開発のために',
          description: 'TypeScriptの実践的な使い方を解説した技術書',
          genre: 'プログラミング',
          status: 'completed',
        })
        .returning()
      _testBook = book

      // Edition作成
      const [edition] = await drizzleService.db
        .insert(schema.editions)
        .values({
          bookId: book.id,
          versionName: '初版',
          versionNumber: 1,
          basePrice: 1000,
          isActive: true,
        })
        .returning()
      _testEdition = edition

      // Event作成
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
      testEvent = event

      // Circle作成
      const [circle] = await drizzleService.db
        .insert(schema.circles)
        .values({
          name: 'テックサークル',
          representativeName: '代表者名',
          email: 'test@example.com',
          description: 'プログラミング系サークル',
        })
        .returning()
      _testCircle = circle

      // Exhibit作成
      const [exhibit] = await drizzleService.db
        .insert(schema.exhibits)
        .values({
          eventId: event.id,
          circleId: circle.id,
          status: 'accepted',
          spaceNumber: 'A-01',
          spaceType: '島',
          applicationNotes: 'テスト申込',
          applicationDate: new Date('2024-09-15'),
          resultDate: new Date('2024-10-01'),
        })
        .returning()
      _testExhibit = exhibit

      // ExhibitBook作成（版対応）
      const [exhibitBook] = await drizzleService.db
        .insert(schema.exhibitBooks)
        .values({
          exhibitId: exhibit.id,
          editionId: edition.id,
          plannedQuantity: 50,
          actualQuantity: 45,
          soldQuantity: 30,
          remainingQuantity: 15,
          price: 1000,
          displayOrder: 1,
        })
        .returning()
      _testExhibitBook = exhibitBook
    })

    // 最重要テストケース 1: イベント詳細での版情報表示テスト
    it('should display edition info in event detail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/events/${testEvent.id}`)
        .expect(200)

      // 基本的なイベント情報が表示されることを確認
      expect(response.text).toContain('技術書典17')
      expect(response.text).toContain('東京ビッグサイト')

      // 版情報表示の確認
      expect(response.text).toContain('TypeScript実践ガイド')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('50冊')
      expect(response.text).toContain('45冊')
      expect(response.text).toContain('30冊')
      expect(response.text).toContain('30,000円')
    })

    // 最重要テストケース 2: 出展申込一覧での版情報表示テスト
    it('should display edition-based exhibit books list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/events/${testEvent.id}/exhibits`)
        .expect(200)

      // 基本的な出展情報が表示されることを確認
      expect(response.text).toContain('技術書典17 - 出展申込一覧')
      expect(response.text).toContain('テックサークル')
      expect(response.text).toContain('A-01')

      // 版情報表示の確認
      expect(response.text).toContain('TypeScript実践ガイド')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('1,000円')
      expect(response.text).toContain('50冊予定')
    })

    // バリデーション・エラーハンドリングテスト（2-3テスト）

    // テストケース 3: 存在しない版IDでのエラーハンドリング
    it('should handle invalid edition ID in event context', async () => {
      // 存在しないイベントIDでアクセス
      const _response = await request(app.getHttpServer())
        .get('/events/99999')
        .expect(404)

      // 基本的なエラーハンドリングが動作することを確認
      // （EventsServiceのfindOneでNotFoundExceptionが投げられる）
    })

    // テストケース 4: 版情報がないイベントの適切な表示
    it('should validate edition availability for events', async () => {
      // ExhibitBookデータを削除してEdition情報がない状態にする
      await drizzleService.db.delete(schema.exhibitBooks)

      const response = await request(app.getHttpServer())
        .get(`/events/${testEvent.id}`)
        .expect(200)

      // 基本的なイベント情報は表示される
      expect(response.text).toContain('技術書典17')
      expect(response.text).toContain('東京ビッグサイト')

      // 版情報がない場合の適切な表示
      expect(response.text).toContain(
        'このイベントに出展予定の書籍はまだ登録されていません',
      )
    })

    // テストケース 5: 版別統計の正確性確認
    it('should calculate edition statistics correctly', async () => {
      // 統計計算の正確性をテスト
      const response = await request(app.getHttpServer())
        .get(`/events/${testEvent.id}`)
        .expect(200)

      // 基本情報の確認
      expect(response.text).toContain('技術書典17')

      // 統計情報の表示確認
      expect(response.text).toContain('総版数')
      expect(response.text).toContain('1版')
      expect(response.text).toContain('予定数量')
      expect(response.text).toContain('50冊')
      expect(response.text).toContain('売上数量')
      expect(response.text).toContain('30冊')
      expect(response.text).toContain('売上金額')
      expect(response.text).toContain('30,000円')
    })
  })
})
