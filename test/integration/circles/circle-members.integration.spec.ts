import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Circle Members Integration Tests', () => {
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

    // テスト用データの作成
    await drizzleService.db.insert(schema.circles).values([
      {
        id: 1,
        name: 'テックサークル',
        representativeName: '山田太郎',
        email: 'yamada@example.com',
        description: '技術系同人誌を頒布するサークルです',
      },
    ])

    await drizzleService.db.insert(schema.authors).values([
      {
        id: 1,
        name: '田中一郎',
        email: 'tanaka@example.com',
        bio: 'フロントエンド開発者',
      },
      {
        id: 2,
        name: '佐藤花子',
        email: 'sato@example.com',
        bio: 'バックエンド開発者',
      },
      {
        id: 3,
        name: '鈴木次郎',
        email: 'suzuki@example.com',
        bio: 'インフラエンジニア',
      },
    ])

    // 既存のメンバー関係を作成
    await drizzleService.db.insert(schema.circleAuthors).values([
      {
        circleId: 1,
        authorId: 1,
        role: 'representative',
        joinedAt: new Date('2024-01-01'),
        notes: '代表者',
      },
    ])
  })

  // Phase 1: ミニマム実装テスト（1-2テスト）
  describe('GET /circles/:circleId/members', () => {
    it('サークルメンバーの一覧が表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/circles/1/members')
        .expect(200)

      expect(response.text).toContain('メンバー一覧')
      expect(response.text).toContain('テックサークル')
      expect(response.text).toContain('田中一郎')
      expect(response.text).toContain('代表者')
    })

    it('存在しないサークルの場合404エラーが返される', async () => {
      await request(app.getHttpServer())
        .get('/circles/999/members')
        .expect(404)
    })
  })

  describe('GET /circles/:circleId/members/add', () => {
    it('メンバー追加フォームが表示される', async () => {
      const response = await request(app.getHttpServer())
        .get('/circles/1/members/add')
        .expect(200)

      expect(response.text).toContain('メンバー追加')
      expect(response.text).toContain('テックサークル')
      expect(response.text).toContain('佐藤花子') // 未所属の執筆者
      expect(response.text).toContain('鈴木次郎') // 未所属の執筆者
      // 既に所属している田中一郎は表示されないことを確認
      expect(response.text).not.toContain('田中一郎')
    })
  })

  describe('POST /circles/:circleId/members', () => {
    it('新しいメンバーが追加される', async () => {
      const memberData = {
        authorId: 2,
        role: 'member',
        notes: 'バックエンド担当',
      }

      const _response = await request(app.getHttpServer())
        .post('/circles/1/members')
        .send(memberData)
        .expect(302) // リダイレクト

      // データベース確認
      const members = await drizzleService.db
        .select()
        .from(schema.circleAuthors)
        .where(eq(schema.circleAuthors.circleId, 1))

      expect(members).toHaveLength(2) // 初期メンバー + 新規追加
      expect(members[1].authorId).toBe(2)
      expect(members[1].role).toBe('member')
      expect(members[1].notes).toBe('バックエンド担当')
    })

    it('必須フィールドが空の場合エラーが表示される', async () => {
      const memberData = {
        authorId: '', // 空の執筆者ID
        role: 'member',
      }

      const response = await request(app.getHttpServer())
        .post('/circles/1/members')
        .send(memberData)
        .expect(200) // ValidationExceptionFilterが200でエラーページを返す
        .expect('Content-Type', /html/)

      expect(response.text).toContain('執筆者IDは正の数で入力してください')
    })

    it('既に所属している執筆者の場合エラーが表示される', async () => {
      const memberData = {
        authorId: 1, // 既に所属している執筆者
        role: 'member',
      }

      const response = await request(app.getHttpServer())
        .post('/circles/1/members')
        .send(memberData)
        .expect(400)

      expect(response.text).toContain(
        'この執筆者は既にサークルに所属しています',
      )
    })
  })
})
