import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Books Show (Integration)', () => {
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

  afterEach(async () => {
    // testDbUtilsを使用して全テーブルをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('GET /books/:id', () => {
    it('書籍の詳細を表示すること', async () => {
      // テストデータの準備
      const testDate = new Date('2024-01-01')
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'テスト書籍タイトル',
          subtitle: 'テストサブタイトル',
          description:
            'これはテスト用の説明文です。詳細な内容が含まれています。',
          pageCount: 200,
          status: 'writing',
          createdAt: testDate,
          updatedAt: testDate,
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)

      // ページタイトルとパンくずリスト
      expect(response.text).toContain('書籍詳細')
      expect(response.text).toContain('href="/books"')
      expect(response.text).toContain('書籍一覧')

      // 書籍情報
      expect(response.text).toContain('テスト書籍タイトル')
      expect(response.text).toContain('テストサブタイトル')
      expect(response.text).toContain(
        'これはテスト用の説明文です。詳細な内容が含まれています。',
      )
      expect(response.text).toContain('200ページ')
      expect(response.text).toContain('執筆中')

      // アクションボタン
      expect(response.text).toContain(`href="/books/${testBook.id}/edit"`)
      expect(response.text).toContain('編集')
      expect(response.text).toContain(
        `href="/books/${testBook.id}/status/edit"`,
      )
      expect(response.text).toContain('ステータス変更')
      expect(response.text).toContain(`href="/books/${testBook.id}/deadlines"`)
      expect(response.text).toContain('締切一覧')
    })

    it('サブタイトルがない場合も正常に表示すること', async () => {
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'サブタイトルなし書籍',
          description: '説明文',
          pageCount: 100,
          status: 'planning',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)

      expect(response.text).toContain('サブタイトルなし書籍')
      expect(response.text).toContain('企画中')
      expect(response.text).not.toContain('undefined')
      expect(response.text).not.toContain('null')
    })

    it('説明文とページ数がない場合も正常に表示すること', async () => {
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: '最小限の書籍',
          status: 'completed',
        })
        .returning()

      const response = await request(app.getHttpServer())
        .get(`/books/${testBook.id}`)
        .expect(200)

      expect(response.text).toContain('最小限の書籍')
      expect(response.text).toContain('完成')
      expect(response.text).toContain('説明なし')
      expect(response.text).toContain('ページ数未設定')
    })

    it('存在しない書籍の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer()).get('/books/999999').expect(404)
    })

    it('不正なIDの場合は400エラーを返すこと', async () => {
      await request(app.getHttpServer()).get('/books/invalid-id').expect(400)
    })
  })
})
