import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import {
  events,
  type Author,
  type Book,
  type Edition,
  type Event,
  type StorageLocation,
  authors,
  books,
  editions,
  salesDetails,
  salesTransactions,
  storageLocations,
} from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('販売管理全機能（Integration）', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: Book
  let testEdition: Edition
  let testAuthor: Author
  let testEvent: Event
  let testLocation: StorageLocation
  let createdSalesId: number

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
    const [newAuthor] = await drizzleService.db
      .insert(authors)
      .values({
        name: 'テスト執筆者',
        email: 'author@test.com',
        bio: 'テスト用の執筆者です',
      })
      .returning()
    testAuthor = newAuthor

    const [newBook] = await drizzleService.db
      .insert(books)
      .values({
        title: 'テスト書籍',
        subtitle: 'テスト用の書籍です',
        description: 'これはテスト用の書籍です',
        status: 'completed',
      })
      .returning()
    testBook = newBook

    const [newEdition] = await drizzleService.db
      .insert(editions)
      .values({
        bookId: testBook.id,
        versionName: '初版',
        versionNumber: 1,
        basePrice: 1000,
        printingCost: 500,
        publishDate: '2024-01-01',
        pageCount: 100,
        isbn: '9784123456789',
        isActive: true,
      })
      .returning()
    testEdition = newEdition

    const [newEvent] = await drizzleService.db
      .insert(events)
      .values({
        name: 'テストイベント',
        eventDate: '2024-12-15',
        venue: 'テスト会場',
        applicationStartDate: '2024-11-01',
        applicationEndDate: '2024-11-30',
        description: 'テスト用のイベントです',
      })
      .returning()
    testEvent = newEvent

    const [newLocation] = await drizzleService.db
      .insert(storageLocations)
      .values({
        name: 'テスト保管場所',
        type: 'event',
        address: 'テスト住所',
        contactInfo: 'テスト連絡先',
      })
      .returning()
    testLocation = newLocation
  })

  describe('GET /sales', () => {
    it('販売記録一覧が正常に表示される', async () => {
      // テスト用販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'event',
          eventId: testEvent.id,
          locationId: testLocation.id,
          customerName: 'テスト顧客',
          customerEmail: 'customer@test.com',
          totalAmount: 1000,
          discountAmount: 0,
          finalAmount: 1000,
          paymentMethod: 'cash',
          notes: 'テスト用販売記録',
        })
        .returning()

      await drizzleService.db.insert(salesDetails).values({
        transactionId: salesTransaction.id,
        editionId: testEdition.id,
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 0,
        subtotal: 1000,
      })

      const response = await request(app.getHttpServer()).get('/sales')

      expect(response.status).toBe(200)
      expect(response.text).toContain('販売記録一覧')
      expect(response.text).toContain('テスト顧客')
      expect(response.text).toContain('¥1,000')
      expect(response.text).toContain('イベント')
    })

    it('販売記録がない場合でも正常に表示される', async () => {
      const response = await request(app.getHttpServer()).get('/sales')

      expect(response.status).toBe(200)
      expect(response.text).toContain('販売記録一覧')
      expect(response.text).toContain('販売記録がありません')
    })
  })

  describe('POST /sales', () => {
    it('有効なデータで販売記録が正常に作成される', async () => {
      const validSalesData = {
        transactionType: 'event',
        eventId: testEvent.id,
        locationId: testLocation.id,
        customerName: 'テスト顧客',
        customerEmail: 'customer@test.com',
        totalAmount: 2000,
        discountAmount: 100,
        finalAmount: 1900,
        paymentMethod: 'cash',
        notes: 'テスト用販売記録',
        details: [
          {
            editionId: testEdition.id,
            quantity: 2,
            unitPrice: 1000,
            discountAmount: 100,
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/sales')
        .send(validSalesData)

      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/sales')

      // データベースに正しく保存されているか確認
      const salesRecords = await drizzleService.db
        .select()
        .from(salesTransactions)
        .where(eq(salesTransactions.customerName, 'テスト顧客'))

      expect(salesRecords.length).toBe(1)
      const salesRecord = salesRecords[0]
      expect(salesRecord.transactionType).toBe('event')
      expect(salesRecord.totalAmount).toBe(2000)
      expect(salesRecord.finalAmount).toBe(1900)

      // 販売明細も確認
      const detailRecords = await drizzleService.db
        .select()
        .from(salesDetails)
        .where(eq(salesDetails.transactionId, salesRecord.id))

      expect(detailRecords.length).toBe(1)
      const detailRecord = detailRecords[0]
      expect(detailRecord.quantity).toBe(2)
      expect(detailRecord.unitPrice).toBe(1000)

      createdSalesId = salesRecord.id
    })
  })

  describe('GET /sales/:id', () => {
    beforeEach(async () => {
      // テスト用販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'online',
          eventId: null,
          locationId: testLocation.id,
          customerName: 'オンライン顧客',
          customerEmail: 'online@test.com',
          totalAmount: 3000,
          discountAmount: 200,
          finalAmount: 2800,
          paymentMethod: 'card',
          notes: 'オンライン販売のテスト',
        })
        .returning()

      await drizzleService.db.insert(salesDetails).values({
        transactionId: salesTransaction.id,
        editionId: testEdition.id,
        quantity: 3,
        unitPrice: 1000,
        discountAmount: 200,
        subtotal: 2800,
      })

      createdSalesId = salesTransaction.id
    })

    it('販売記録詳細が正常に表示される', async () => {
      const response = await request(app.getHttpServer()).get(
        `/sales/${createdSalesId}`,
      )

      expect(response.status).toBe(200)
      expect(response.text).toContain('販売記録詳細')
      expect(response.text).toContain('オンライン顧客')
      expect(response.text).toContain('online@test.com')
      expect(response.text).toContain('オンライン販売')
      expect(response.text).toContain('¥3,000')
      expect(response.text).toContain('¥2,800')
      expect(response.text).toContain('テスト書籍')
      expect(response.text).toContain('初版')
      expect(response.text).toContain('3') // 数量
    })

    it('存在しない販売記録にアクセスすると404エラーが返される', async () => {
      const response = await request(app.getHttpServer()).get('/sales/99999')

      expect(response.status).toBe(404)
    })
  })

  describe('GET /sales/:id/edit', () => {
    beforeEach(async () => {
      // テスト用販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'consignment',
          eventId: testEvent.id,
          locationId: testLocation.id,
          customerName: '委託販売顧客',
          customerEmail: 'consignment@test.com',
          totalAmount: 1500,
          discountAmount: 0,
          finalAmount: 1500,
          paymentMethod: 'transfer',
          notes: '委託販売のテスト',
        })
        .returning()

      createdSalesId = salesTransaction.id
    })

    it('販売記録編集フォームが正常に表示される', async () => {
      const response = await request(app.getHttpServer()).get(
        `/sales/${createdSalesId}/edit`,
      )

      expect(response.status).toBe(200)
      expect(response.text).toContain('販売記録編集')
      expect(response.text).toContain('委託販売顧客')
      expect(response.text).toContain('consignment@test.com')
      expect(response.text).toContain('委託販売のテスト')
      expect(response.text).toContain('selected>委託販売')
      expect(response.text).toContain('selected>振込')
    })

    it('存在しない販売記録の編集ページにアクセスすると404エラーが返される', async () => {
      const response = await request(app.getHttpServer()).get(
        '/sales/99999/edit',
      )

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /sales/:id (via POST with _method)', () => {
    beforeEach(async () => {
      // テスト用販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'direct',
          eventId: null,
          locationId: testLocation.id,
          customerName: '直接販売顧客',
          customerEmail: 'direct@test.com',
          totalAmount: 800,
          discountAmount: 0,
          finalAmount: 800,
          paymentMethod: 'cash',
          notes: '直接販売のテスト',
        })
        .returning()

      createdSalesId = salesTransaction.id
    })

    it('有効なデータで販売記録が正常に更新される', async () => {
      const updateData = {
        _method: 'PUT',
        transactionType: 'direct',
        customerName: '更新された顧客名',
        customerEmail: 'updated@test.com',
        paymentMethod: 'card',
        notes: '更新されたメモ',
      }

      const response = await request(app.getHttpServer())
        .post(`/sales/${createdSalesId}`)
        .send(updateData)

      expect(response.status).toBe(302)
      expect(response.headers.location).toBe(`/sales/${createdSalesId}`)

      // データベースで更新されているか確認
      const updatedRecord = await drizzleService.db
        .select()
        .from(salesTransactions)
        .where(eq(salesTransactions.id, createdSalesId))
        .limit(1)

      expect(updatedRecord.length).toBe(1)
      expect(updatedRecord[0].customerName).toBe('更新された顧客名')
      expect(updatedRecord[0].customerEmail).toBe('updated@test.com')
      expect(updatedRecord[0].paymentMethod).toBe('card')
      expect(updatedRecord[0].notes).toBe('更新されたメモ')
    })

    it('存在しない販売記録の更新を試みると404エラーが返される', async () => {
      const updateData = {
        _method: 'PUT',
        customerName: '存在しない記録',
      }

      const response = await request(app.getHttpServer())
        .post('/sales/99999')
        .send(updateData)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /sales/:id (via POST with _method)', () => {
    beforeEach(async () => {
      // テスト用販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'event',
          eventId: testEvent.id,
          locationId: testLocation.id,
          customerName: '削除予定顧客',
          customerEmail: 'delete@test.com',
          totalAmount: 1200,
          discountAmount: 0,
          finalAmount: 1200,
          paymentMethod: 'cash',
          notes: '削除予定の販売記録',
        })
        .returning()

      await drizzleService.db.insert(salesDetails).values({
        transactionId: salesTransaction.id,
        editionId: testEdition.id,
        quantity: 1,
        unitPrice: 1200,
        discountAmount: 0,
        subtotal: 1200,
      })

      createdSalesId = salesTransaction.id
    })

    it('販売記録が正常に削除される', async () => {
      const deleteData = {
        _method: 'DELETE',
      }

      const response = await request(app.getHttpServer())
        .post(`/sales/${createdSalesId}`)
        .send(deleteData)

      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/sales')

      // データベースから削除されているか確認
      const deletedRecord = await drizzleService.db
        .select()
        .from(salesTransactions)
        .where(eq(salesTransactions.id, createdSalesId))

      expect(deletedRecord.length).toBe(0)

      // 関連する販売明細も削除されているか確認
      const deletedDetails = await drizzleService.db
        .select()
        .from(salesDetails)
        .where(eq(salesDetails.transactionId, createdSalesId))

      expect(deletedDetails.length).toBe(0)
    })

    it('存在しない販売記録の削除を試みると404エラーが返される', async () => {
      const deleteData = {
        _method: 'DELETE',
      }

      const response = await request(app.getHttpServer())
        .post('/sales/99999')
        .send(deleteData)

      expect(response.status).toBe(404)
    })
  })

  describe('エッジケースのテスト', () => {
    it('無効なIDでアクセスすると400エラーが返される', async () => {
      const response = await request(app.getHttpServer()).get(
        '/sales/invalid-id',
      )

      expect(response.status).toBe(400)
    })

    it('負の数のIDでアクセスすると404エラーが返される', async () => {
      const response = await request(app.getHttpServer()).get('/sales/-1')

      expect(response.status).toBe(404)
    })

    it('ゼロのIDでアクセスすると404エラーが返される', async () => {
      const response = await request(app.getHttpServer()).get('/sales/0')

      expect(response.status).toBe(404)
    })
  })

  describe('データ整合性のテスト', () => {
    it('関連するイベントが削除されても販売記録は残る', async () => {
      // 販売記録を作成
      const [salesTransaction] = await drizzleService.db
        .insert(salesTransactions)
        .values({
          transactionType: 'event',
          eventId: testEvent.id,
          locationId: testLocation.id,
          customerName: 'データ整合性テスト',
          customerEmail: 'integrity@test.com',
          totalAmount: 1000,
          discountAmount: 0,
          finalAmount: 1000,
          paymentMethod: 'cash',
        })
        .returning()

      // 販売記録のeventIdをnullに設定してからイベントを削除
      await drizzleService.db
        .update(salesTransactions)
        .set({ eventId: null })
        .where(eq(salesTransactions.eventId, testEvent.id))

      // イベントを削除
      await drizzleService.db.delete(events).where(eq(events.id, testEvent.id))

      // 販売記録は残っているが、イベント情報はnullになる
      const response = await request(app.getHttpServer()).get(
        `/sales/${salesTransaction.id}`,
      )

      expect(response.status).toBe(200)
      expect(response.text).toContain('データ整合性テスト')
      // イベント欄は「-」で表示される
      expect(response.text).toContain('-')
    })
  })
})
