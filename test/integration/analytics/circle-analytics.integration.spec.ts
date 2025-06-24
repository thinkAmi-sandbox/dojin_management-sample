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
          name: 'アクティブサークル',
          representativeName: '代表者1',
          email: 'active@example.com',
          description: '活発なサークル',
        },
        {
          name: 'ベテランサークル',
          representativeName: '代表者2',
          email: 'veteran@example.com',
          description: 'ベテランサークル',
        },
        {
          name: '新人サークル',
          representativeName: '代表者3',
          email: 'newbie@example.com',
          description: '新人サークル',
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
        {
          title: 'テスト書籍3',
          subtitle: 'サブタイトル3',
          description: '説明3',
          pageCount: 150,
          status: 'completed',
        },
      ])
      .returning({ id: books.id })

    // テスト用出展申込データ作成（サークル別の実績パターン）
    const exhibitResults = await drizzleService.db
      .insert(exhibits)
      .values([
        // アクティブサークル: 技術書典17（当選）
        {
          eventId: eventResults[0].id,
          circleId: circleResults[0].id,
          status: 'accepted',
          spaceNumber: 'A-01',
          spaceType: '机上',
        },
        // アクティブサークル: コミケ105（当選）
        {
          eventId: eventResults[1].id,
          circleId: circleResults[0].id,
          status: 'accepted',
          spaceNumber: 'B-02',
          spaceType: '机上',
        },
        // ベテランサークル: 技術書典17（当選）
        {
          eventId: eventResults[0].id,
          circleId: circleResults[1].id,
          status: 'accepted',
          spaceNumber: 'A-10',
          spaceType: '机上',
        },
        // ベテランサークル: コミケ105（落選）
        {
          eventId: eventResults[1].id,
          circleId: circleResults[1].id,
          status: 'rejected',
        },
        // 新人サークル: 技術書典17（申込中）
        {
          eventId: eventResults[0].id,
          circleId: circleResults[2].id,
          status: 'applied',
        },
      ])
      .returning({ id: exhibits.id })

    // テスト用出展書籍データ作成
    await drizzleService.db.insert(exhibitBooks).values([
      // アクティブサークル: 技術書典17 - 2冊
      {
        exhibitId: exhibitResults[0].id,
        bookId: bookResults[0].id,
        plannedQuantity: 50,
        price: 1000,
        displayOrder: 1,
      },
      {
        exhibitId: exhibitResults[0].id,
        bookId: bookResults[1].id,
        plannedQuantity: 30,
        price: 1500,
        displayOrder: 2,
      },
      // アクティブサークル: コミケ105 - 1冊
      {
        exhibitId: exhibitResults[1].id,
        bookId: bookResults[0].id,
        plannedQuantity: 100,
        price: 800,
        displayOrder: 1,
      },
      // ベテランサークル: 技術書典17 - 3冊
      {
        exhibitId: exhibitResults[2].id,
        bookId: bookResults[0].id,
        plannedQuantity: 80,
        price: 1200,
        displayOrder: 1,
      },
      {
        exhibitId: exhibitResults[2].id,
        bookId: bookResults[1].id,
        plannedQuantity: 60,
        price: 1800,
        displayOrder: 2,
      },
      {
        exhibitId: exhibitResults[2].id,
        bookId: bookResults[2].id,
        plannedQuantity: 40,
        price: 2000,
        displayOrder: 3,
      },
    ])
  })

  describe('GET /analytics/circles', () => {
    it('サークル別出展実績分析が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/circles')
        .expect(200)

      expect(response.text).toContain('サークル別出展実績分析')
      expect(response.text).toContain('アクティブサークル')
      expect(response.text).toContain('ベテランサークル')
      expect(response.text).toContain('新人サークル')
    })

    it('サークル別の統計情報が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/circles')
        .expect(200)

      // サークル名の確認
      expect(response.text).toContain('アクティブサークル')
      expect(response.text).toContain('ベテランサークル')

      // 統計データの確認（実際に表示される内容）
      expect(response.text).toContain('当選')
      expect(response.text).toContain('284,000円')
      expect(response.text).toContain('95,000円')
    })
  })
})
