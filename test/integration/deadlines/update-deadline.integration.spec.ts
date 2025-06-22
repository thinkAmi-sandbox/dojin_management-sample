import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books, deadlines } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Deadlines Update (Integration)', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBookId: number
  let testDeadlineId: number

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    setupTestApp(app)
    drizzleService = moduleRef.get<DrizzleService>(DrizzleService)
    await app.init()
  })

  beforeEach(async () => {
    // 各テストで新しいテストデータを作成
    const timestamp = Date.now()
    const [testBook] = await drizzleService.db
      .insert(books)
      .values({
        title: `テスト書籍_${timestamp}`,
      })
      .returning()
    testBookId = testBook.id

    const [testDeadline] = await drizzleService.db
      .insert(deadlines)
      .values({
        bookId: testBookId,
        title: `テスト締切_${timestamp}`,
        dueDate: new Date('2024-12-31'),
        description: `テスト説明_${timestamp}`,
      })
      .returning()
    testDeadlineId = testDeadline.id
  })


  afterAll(async () => {
    await testDbUtils.closeConnection()
    await app.close()
  })

  describe('GET /deadlines/:id/edit', () => {
    it('既存の締切の編集フォームを表示すること', async () => {
      const response = await request(app.getHttpServer())
        .get(`/deadlines/${testDeadlineId}/edit`)
        .expect(200)

      expect(response.text).toContain('締切編集')
      expect(response.text).toMatch(/テスト締切_\d+/)
      expect(response.text).toContain('2024-12-31')
      expect(response.text).toMatch(/テスト説明_\d+/)
      expect(response.text).toContain('name="_method" value="PUT"')
    })

    it('存在しない締切の場合は404エラーを返すこと', async () => {
      await request(app.getHttpServer())
        .get('/deadlines/999999/edit')
        .expect(404)
    })
  })

  describe('PUT /deadlines/:id', () => {
    it('締切情報を正常に更新すること', async () => {
      const updateData = {
        title: '更新後タイトル',
        dueDate: '2024-12-31',
        description: '更新後説明',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post(`/deadlines/${testDeadlineId}`)
        .send(updateData)
        .expect(302)
        .expect('Location', `/books/${testBookId}/deadlines`)

      // 更新されたデータを確認
      const [updatedDeadline] = await drizzleService.db
        .select()
        .from(deadlines)
        .where(eq(deadlines.id, testDeadlineId))

      expect(updatedDeadline.title).toBe('更新後タイトル')
      expect(updatedDeadline.dueDate.toISOString().split('T')[0]).toBe(
        '2024-12-31',
      )
      expect(updatedDeadline.description).toBe('更新後説明')
    })

    it('必須フィールドが空の場合はバリデーションエラーとなること', async () => {
      const updateData = {
        title: '',
        dueDate: '',
        _method: 'PUT',
      }

      const response = await request(app.getHttpServer())
        .post(`/deadlines/${testDeadlineId}`)
        .send(updateData)
        .expect(200)

      expect(response.text).toContain('タイトルは必須です')
      expect(response.text).toContain('締切日は必須です')
      expect(response.text).toContain('締切編集')
    })

    it('存在しない締切の更新は404エラーを返すこと', async () => {
      const updateData = {
        title: '更新タイトル',
        dueDate: '2024-12-31',
        _method: 'PUT',
      }

      await request(app.getHttpServer())
        .post('/deadlines/999999')
        .send(updateData)
        .expect(404)
    })
  })
})
