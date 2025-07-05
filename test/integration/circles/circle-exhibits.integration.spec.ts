import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Circle Exhibits Integration Tests', () => {
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

    // テスト用データの作成
    const [event] = await drizzleService.db
      .insert(schema.events)
      .values({
        name: '技術書典17',
        eventDate: '2024-12-07',
        venue: '東京ビッグサイト',
        applicationStartDate: '2024-09-01',
        applicationEndDate: '2024-09-30',
        description: 'テストイベント',
      })
      .returning()

    const [circle] = await drizzleService.db
      .insert(schema.circles)
      .values({
        name: 'テストサークル',
        representativeName: '代表者名',
        email: 'test@example.com',
        description: 'テスト用サークル',
      })
      .returning()

    await drizzleService.db.insert(schema.exhibits).values({
      eventId: event.id,
      circleId: circle.id,
      status: 'applied',
      applicationNotes: 'サークル申込備考',
    })
  })

  describe('GET /circles/:circleId/exhibits', () => {
    it('サークル別出展履歴が表示される', async () => {
      const circlesData = await drizzleService.db.select().from(schema.circles)
      const circleId = circlesData[0].id

      const response = await request(app.getHttpServer())
        .get(`/circles/${circleId}/exhibits`)
        .expect(200)

      expect(response.text).toContain('テストサークル - 出展履歴')
      expect(response.text).toContain('技術書典17')
      expect(response.text).toContain('申込中')
    })
  })

  describe('GET /circles/:circleId/exhibits/new', () => {
    it('サークルからの新規出展申込画面が表示される', async () => {
      const circlesData = await drizzleService.db.select().from(schema.circles)
      const circleId = circlesData[0].id

      const response = await request(app.getHttpServer())
        .get(`/circles/${circleId}/exhibits/new`)
        .expect(200)

      expect(response.text).toContain('テストサークル - 新規出展申込')
      expect(response.text).toContain('申込イベント')
      expect(response.text).toContain('申込備考')
    })
  })

  describe('POST /circles/:circleId/exhibits', () => {
    it('サークルからの新規出展申込が作成される', async () => {
      const eventsData = await drizzleService.db.select().from(schema.events)
      const circlesData = await drizzleService.db.select().from(schema.circles)
      const eventId = eventsData[0].id
      const circleId = circlesData[0].id

      const exhibitData = {
        eventId: eventId, // 必須フィールド
        circleId: circleId, // 必須フィールド
        spaceType: '島',
        applicationNotes: 'サークル新規申込テスト',
      }

      const response = await request(app.getHttpServer())
        .post(`/circles/${circleId}/exhibits`)
        .send(exhibitData)
        .expect(302)

      // データベース確認
      const exhibits = await drizzleService.db.select().from(schema.exhibits)
      expect(exhibits).toHaveLength(2) // 初期データ + 新規作成

      const newExhibit = exhibits.find(
        (e) => e.applicationNotes === 'サークル新規申込テスト',
      )
      expect(newExhibit).toBeDefined()
      expect(newExhibit!.eventId).toBe(eventId)
      expect(newExhibit!.circleId).toBe(circleId)
      expect(newExhibit!.status).toBe('applied')
      expect(newExhibit!.spaceType).toBe('島')
    })
  })
})
