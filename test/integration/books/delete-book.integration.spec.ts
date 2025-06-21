import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Books Delete (Integration)', () => {
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

  afterEach(async () => {
    // testDbUtilsを使用して全テーブルをクリーンアップ
    await testDbUtils.cleanupDatabase()
  })

  describe('DELETE /books/:id', () => {
    it('書籍を正常に削除すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: '削除テスト書籍',
          subtitle: 'テストサブタイトル',
          description: '削除される予定の書籍です',
          pageCount: 100,
        })
        .returning()

      // 削除前に書籍が存在することを確認
      const beforeDelete = await drizzleService.db.select().from(books)
      expect(beforeDelete).toHaveLength(1)

      // 削除リクエスト
      await request(app.getHttpServer())
        .delete(`/books/${testBook.id}`)
        .expect(302) // リダイレクト
        .expect('Location', '/books')

      // 削除後に書籍が存在しないことを確認
      const afterDelete = await drizzleService.db.select().from(books)
      expect(afterDelete).toHaveLength(0)
    })

    it('HTTPメソッドオーバーライドで削除すること', async () => {
      // テストデータの準備
      const [testBook] = await drizzleService.db
        .insert(books)
        .values({
          title: 'オーバーライド削除テスト',
          description: 'POSTメソッドで削除される書籍',
        })
        .returning()

      // POSTメソッド + _method=DELETE で削除
      await request(app.getHttpServer())
        .post(`/books/${testBook.id}`)
        .send({ _method: 'DELETE' })
        .expect(302)
        .expect('Location', '/books')

      // 削除されたことを確認
      const afterDelete = await drizzleService.db.select().from(books)
      expect(afterDelete).toHaveLength(0)
    })

    it('存在しない書籍の削除時は404エラーを返すこと', async () => {
      await request(app.getHttpServer()).delete('/books/999999').expect(404)
    })

    it('不正なIDの場合は400エラーを返すこと', async () => {
      await request(app.getHttpServer()).delete('/books/invalid-id').expect(400)
    })

    it('複数の書籍がある場合、指定した書籍のみ削除すること', async () => {
      // 複数のテストデータを準備
      const [book1, book2, book3] = await drizzleService.db
        .insert(books)
        .values([
          { title: '削除対象書籍' },
          { title: '残す書籍1' },
          { title: '残す書籍2' },
        ])
        .returning()

      // book1のみを削除
      await request(app.getHttpServer())
        .delete(`/books/${book1.id}`)
        .expect(302)

      // 残りの書籍が存在することを確認
      const remainingBooks = await drizzleService.db.select().from(books)
      expect(remainingBooks).toHaveLength(2)
      expect(remainingBooks.map((b) => b.title)).toContain('残す書籍1')
      expect(remainingBooks.map((b) => b.title)).toContain('残す書籍2')
      expect(remainingBooks.map((b) => b.title)).not.toContain('削除対象書籍')
    })
  })
})
