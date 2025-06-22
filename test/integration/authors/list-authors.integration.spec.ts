import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('GET /authors', () => {
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
    // 各テスト前に全データをクリーンアップ（他のテストファイルの影響を除去）
    await testDbUtils.cleanupDatabase()
  })

  it('執筆者が存在する場合、全件を一覧表示する', async () => {
    // Arrange: NestJSアプリ内のDrizzleServiceを使ってテストデータを作成
    await drizzleService.db.insert(schema.authors).values([
      {
        name: '山田太郎',
        email: 'yamada@example.com',
        bio: 'フロントエンド開発が得意です',
      },
      {
        name: '田中花子',
        email: 'tanaka@example.com',
        bio: 'バックエンド開発とデータベース設計を専門としています',
      },
      {
        name: '佐藤次郎',
        email: null,
        bio: null,
      },
    ])

    // Act: GET /authorsにリクエスト
    const response = await request(app.getHttpServer())
      .get('/authors')
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: HTMLに執筆者情報が含まれることを確認
    expect(response.text).toContain('山田太郎')
    expect(response.text).toContain('yamada@example.com')
    expect(response.text).toContain('フロントエンド開発が得意です')
    expect(response.text).toContain('田中花子')
    expect(response.text).toContain('tanaka@example.com')
    expect(response.text).toContain(
      'バックエンド開発とデータベース設計を専門としています',
    )
    expect(response.text).toContain('佐藤次郎')
  })

  it('執筆者が存在しない場合、空の一覧を表示する', async () => {
    // Act: GET /authorsにリクエスト（データベースは空）
    const response = await request(app.getHttpServer())
      .get('/authors')
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: 執筆者が登録されていないメッセージまたは空のリスト表示を確認
    expect(response.text).toMatch(
      /執筆者が登録されていません|登録された執筆者はありません|No authors found/,
    )
  })

  it('HTMLの基本構造が正しいことを確認する', async () => {
    // Act: GET /authorsにリクエスト
    const response = await request(app.getHttpServer())
      .get('/authors')
      .expect(200)
      .expect('Content-Type', /html/)

    // Assert: 基本的なHTML構造を確認
    expect(response.text).toContain('<!DOCTYPE html>')
    expect(response.text).toContain('<html')
    expect(response.text).toContain('</html>')
    expect(response.text).toMatch(/<title>.*執筆者.*<\/title>/i)
  })
})
