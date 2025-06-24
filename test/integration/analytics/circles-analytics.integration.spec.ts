import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import {
  events,
  books,
  circles,
  exhibitBooks,
  exhibits,
} from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Circle Analytics Integration Tests', () => {
  let app: INestApplication
  let drizzleService: DrizzleService

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    setupTestApp(app)
    await app.init()

    drizzleService = moduleFixture.get<DrizzleService>(DrizzleService)
  })

  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()

    // テスト用イベントデータ作成
    const eventResults = await drizzleService.db
      .insert(events)
      .values([
        {
          name: '技術書典17',
          eventDate: '2024-12-07',
          venue: '東京ビッグサイト',
          applicationStartDate: '2024-09-01',
          applicationEndDate: '2024-09-30',
          description: 'テストイベント1',
        },
        {
          name: 'コミケ105',
          eventDate: '2024-12-31',
          venue: '東京ビッグサイト',
          applicationStartDate: '2024-08-01',
          applicationEndDate: '2024-08-31',
          description: 'テストイベント2',
        },
      ])
      .returning({ id: events.id })

    // テスト用サークルデータ作成
    const circleResults = await drizzleService.db
      .insert(circles)
      .values([
        {
          name: 'テストサークル1',
          representativeName: '代表者1',
          email: 'test1@example.com',
          description: 'テスト用サークル1',
        },
        {
          name: 'テストサークル2',
          representativeName: '代表者2',
          email: 'test2@example.com',
          description: 'テスト用サークル2',
        },
        {
          name: 'テストサークル3',
          representativeName: '代表者3',
          email: 'test3@example.com',
          description: 'テスト用サークル3',
        },
      ])
      .returning({ id: circles.id })

    // テスト用書籍データ作成
    const bookResults = await drizzleService.db
      .insert(books)
      .values([
        {
          title: 'テスト書籍1',
          subtitle: 'サブタイトル1',
          description: '説明1',
          pageCount: 100,
          status: 'completed',
        },
        {
          title: 'テスト書籍2',
          subtitle: 'サブタイトル2',
          description: '説明2',
          pageCount: 200,
          status: 'completed',
        },
      ])
      .returning({ id: books.id })

    // テスト用出展申込データ作成（サークル別実績パターン）
    const exhibitResults = await drizzleService.db
      .insert(exhibits)
      .values([
        // テストサークル1: 当選率高、複数イベント参加
        {
          eventId: eventResults[0].id,
          circleId: circleResults[0].id,
          status: 'accepted',
          spaceNumber: 'A-01',
          spaceType: '机上',
        },
        {
          eventId: eventResults[1].id,
          circleId: circleResults[0].id,
          status: 'accepted',
          spaceNumber: 'B-01',
          spaceType: '机上',
        },
        // テストサークル2: 当選率普通
        {
          eventId: eventResults[0].id,
          circleId: circleResults[1].id,
          status: 'applied',
        },
        {
          eventId: eventResults[1].id,
          circleId: circleResults[1].id,
          status: 'rejected',
        },
        // テストサークル3: 新規申込のみ
        {
          eventId: eventResults[0].id,
          circleId: circleResults[2].id,
          status: 'applied',
        },
      ])
      .returning({ id: exhibits.id })

    // テスト用出展書籍データ作成
    await drizzleService.db.insert(exhibitBooks).values([
      // テストサークル1の書籍（高収益）
      {
        exhibitId: exhibitResults[0].id,
        bookId: bookResults[0].id,
        plannedQuantity: 50,
        price: 2000,
        displayOrder: 1,
      },
      {
        exhibitId: exhibitResults[0].id,
        bookId: bookResults[1].id,
        plannedQuantity: 30,
        price: 1500,
        displayOrder: 2,
      },
      {
        exhibitId: exhibitResults[1].id,
        bookId: bookResults[0].id,
        plannedQuantity: 40,
        price: 2000,
        displayOrder: 1,
      },
      // テストサークル2の書籍（中収益）
      {
        exhibitId: exhibitResults[2].id,
        bookId: bookResults[0].id,
        plannedQuantity: 100,
        price: 800,
        displayOrder: 1,
      },
      // テストサークル3の書籍（低収益）
      {
        exhibitId: exhibitResults[4].id,
        bookId: bookResults[1].id,
        plannedQuantity: 20,
        price: 500,
        displayOrder: 1,
      },
    ])
  })

  describe('GET /analytics/circles', () => {
    it('サークル別出展実績分析が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/circles')
        .expect(200)

      expect(response.text).toContain('サークル別出展実績分析')
      expect(response.text).toContain('テストサークル1')
      expect(response.text).toContain('テストサークル2')
      expect(response.text).toContain('テストサークル3')
    })

    it('サークル別の統計情報が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/circles')
        .expect(200)

      // 申込実績の統計確認
      expect(response.text).toContain('申込数')
      expect(response.text).toContain('当選数')
      expect(response.text).toContain('成功率')
      expect(response.text).toContain('書籍数')
      expect(response.text).toContain('予想売上')
    })
  })
})
