import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

// レポートAPIレスポンスの型定義
interface PeriodData {
  period: string
  totalQuantity: number
  totalAmount: number
  transactionCount: number
}

interface ChannelData {
  transactionType: string
  totalQuantity: number
  totalAmount: number
  transactionCount: number
}

describe('Sales Reports Integration Tests', () => {
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
  })

  describe('Phase 4-3: 売上レポート機能実装', () => {
    describe('Step 1: 基本機能テスト（3件）', () => {
      let testBook: schema.Book
      let testEdition: schema.Edition
      let testEvent: schema.Event
      let testLocation: schema.StorageLocation
      let testSalesTransaction: schema.SalesTransaction

      beforeEach(async () => {
        // テスト用書籍・版を作成
        const [insertedBook] = await drizzleService.db
          .insert(schema.books)
          .values({
            title: '同人誌タイトル',
            status: 'completed',
          })
          .returning()
        testBook = insertedBook

        const [insertedEdition] = await drizzleService.db
          .insert(schema.editions)
          .values({
            bookId: testBook.id,
            versionName: '初版',
            versionNumber: 1,
            pageCount: 100,
            basePrice: 1000,
            isActive: true,
          })
          .returning()
        testEdition = insertedEdition

        // テスト用イベントを作成
        const [insertedEvent] = await drizzleService.db
          .insert(schema.events)
          .values({
            name: 'テストイベント',
            eventDate: '2025-12-31',
            venue: 'テスト会場',
            applicationStartDate: '2025-01-01',
            applicationEndDate: '2025-12-01',
          })
          .returning()
        testEvent = insertedEvent

        // テスト用保管場所を作成
        const [insertedLocation] = await drizzleService.db
          .insert(schema.storageLocations)
          .values({
            name: 'テスト倉庫',
            type: 'warehouse',
            isConsignment: false,
            address: 'テスト住所',
          })
          .returning()
        testLocation = insertedLocation

        // テスト用販売取引を作成
        const [insertedTransaction] = await drizzleService.db
          .insert(schema.salesTransactions)
          .values({
            transactionType: 'event',
            eventId: testEvent.id,
            locationId: testLocation.id,
            customerName: 'テスト顧客',
            totalAmount: 1000,
            discountAmount: 0,
            finalAmount: 1000,
            paymentMethod: 'cash',
            transactionDate: new Date('2025-07-01'),
          })
          .returning()
        testSalesTransaction = insertedTransaction

        // 販売明細を作成
        await drizzleService.db.insert(schema.salesDetails).values({
          transactionId: testSalesTransaction.id,
          editionId: testEdition.id,
          quantity: 1,
          unitPrice: 1000,
          discountAmount: 0,
          subtotal: 1000,
        })
      })

      it('should display sales reports page', async () => {
        // レポート画面の表示テスト
        const response = await request(app.getHttpServer())
          .get('/sales/reports')
          .expect(200)

        // 基本的な画面要素の確認
        expect(response.text).toContain('売上レポート')
        expect(response.text).toContain('フィルター')
        expect(response.text).toContain('開始日')
        expect(response.text).toContain('終了日')
        expect(response.text).toContain('レポート生成')
      })

      it('should generate sales report with data', async () => {
        // フィルター付きレポート生成テスト
        const response = await request(app.getHttpServer())
          .get('/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // レポートデータの表示確認
        expect(response.text).toContain('総取引数')
        expect(response.text).toContain('1件') // 作成した取引が1件
        expect(response.text).toContain('総売上金額')
        expect(response.text).toContain('1,000')
        expect(response.text).toContain(testBook.title)
        expect(response.text).toContain(testEdition.versionName)
      })

      it('should provide sales report API response', async () => {
        // REST API形式のレポート取得テスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // JSONレスポンスの確認
        expect(response.body).toHaveProperty('summary')
        expect(response.body.summary).toHaveProperty('totalTransactions', 1)
        expect(response.body.summary).toHaveProperty('totalQuantity', 1)
        expect(response.body.summary).toHaveProperty('totalAmount', 1000)

        expect(response.body).toHaveProperty('byEdition')
        expect(response.body.byEdition).toHaveLength(1)
        expect(response.body.byEdition[0]).toHaveProperty(
          'bookTitle',
          testBook.title,
        )
        expect(response.body.byEdition[0]).toHaveProperty(
          'editionName',
          testEdition.versionName,
        )
        expect(response.body.byEdition[0]).toHaveProperty('totalQuantity', 1)
        expect(response.body.byEdition[0]).toHaveProperty('totalAmount', 1000)
      })
    })

    describe('Step 2: バリデーション・フィルタリングテスト（3件）', () => {
      let _testEditions: schema.Edition[] = []
      let _testEvents: schema.Event[] = []

      beforeEach(async () => {
        // 複数の版とイベントを作成
        const [book1] = await drizzleService.db
          .insert(schema.books)
          .values({
            title: '書籍1',
            status: 'completed',
          })
          .returning()

        const [book2] = await drizzleService.db
          .insert(schema.books)
          .values({
            title: '書籍2',
            status: 'completed',
          })
          .returning()

        // 各書籍の版を作成
        const [edition1] = await drizzleService.db
          .insert(schema.editions)
          .values({
            bookId: book1.id,
            versionName: '初版',
            versionNumber: 1,
            basePrice: 1000,
            isActive: true,
          })
          .returning()

        const [edition2] = await drizzleService.db
          .insert(schema.editions)
          .values({
            bookId: book2.id,
            versionName: '初版',
            versionNumber: 1,
            basePrice: 1500,
            isActive: true,
          })
          .returning()

        _testEditions = [edition1, edition2]

        // 複数のイベントを作成
        const [event1] = await drizzleService.db
          .insert(schema.events)
          .values({
            name: 'イベント1',
            eventDate: '2025-06-01',
            venue: '会場1',
            applicationStartDate: '2025-01-01',
            applicationEndDate: '2025-05-01',
          })
          .returning()

        const [event2] = await drizzleService.db
          .insert(schema.events)
          .values({
            name: 'イベント2',
            eventDate: '2025-07-01',
            venue: '会場2',
            applicationStartDate: '2025-02-01',
            applicationEndDate: '2025-06-01',
          })
          .returning()

        _testEvents = [event1, event2]

        // 保管場所作成
        const [location] = await drizzleService.db
          .insert(schema.storageLocations)
          .values({
            name: 'メイン倉庫',
            type: 'warehouse',
            isConsignment: false,
          })
          .returning()

        // 複数の販売取引を作成（異なる期間・タイプ）
        const salesData = [
          {
            transactionType: 'event' as const,
            eventId: event1.id,
            locationId: location.id,
            totalAmount: 1000,
            finalAmount: 1000,
            transactionDate: new Date('2025-06-01'),
            editionId: edition1.id,
            quantity: 1,
          },
          {
            transactionType: 'event' as const,
            eventId: event2.id,
            locationId: location.id,
            totalAmount: 3000,
            finalAmount: 3000,
            transactionDate: new Date('2025-07-01'),
            editionId: edition2.id,
            quantity: 2,
          },
          {
            transactionType: 'consignment' as const,
            locationId: location.id,
            totalAmount: 1500,
            finalAmount: 1500,
            transactionDate: new Date('2025-07-15'),
            editionId: edition2.id,
            quantity: 1,
          },
        ]

        for (const sale of salesData) {
          const [transaction] = await drizzleService.db
            .insert(schema.salesTransactions)
            .values({
              transactionType: sale.transactionType,
              eventId: sale.eventId,
              locationId: sale.locationId,
              totalAmount: sale.totalAmount,
              discountAmount: 0,
              finalAmount: sale.finalAmount,
              paymentMethod: 'cash',
              transactionDate: sale.transactionDate,
            })
            .returning()

          await drizzleService.db.insert(schema.salesDetails).values({
            transactionId: transaction.id,
            editionId: sale.editionId,
            quantity: sale.quantity,
            unitPrice: sale.totalAmount / sale.quantity,
            discountAmount: 0,
            subtotal: sale.totalAmount,
          })
        }
      })

      it('should filter sales report by date range', async () => {
        // 期間フィルタリングのテスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // 7月の取引のみが含まれることを確認
        expect(response.body.summary.totalTransactions).toBe(2) // 7/1と7/15の取引
        expect(response.body.summary.totalAmount).toBe(4500) // 3000 + 1500
        expect(response.body.summary.totalQuantity).toBe(3) // 2 + 1
      })

      it('should filter sales report by transaction type', async () => {
        // 取引タイプフィルタリングのテスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports')
          .query({
            transactionType: 'event',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
          })
          .expect(200)

        // イベント販売のみが含まれることを確認
        expect(response.body.summary.totalTransactions).toBe(2)
        expect(response.body.summary.totalAmount).toBe(4000) // 1000 + 3000
        expect(response.body.byChannel).toBeDefined()
        expect(
          response.body.byChannel.find(
            (c: ChannelData) => c.transactionType === 'event',
          ),
        ).toBeDefined()
        expect(
          response.body.byChannel.find(
            (c: ChannelData) => c.transactionType === 'consignment',
          ),
        ).toBeUndefined()
      })

      it('should handle invalid date format gracefully', async () => {
        // 無効な日付フォーマットのハンドリングテスト
        const response = await request(app.getHttpServer())
          .get('/sales/reports')
          .query({
            startDate: 'invalid-date',
            endDate: '2025-07-31',
          })
          .expect(200)

        // エラーではなく、全データを表示することを確認
        expect(response.text).toContain('売上レポート')
        expect(response.text).not.toContain('エラー')
      })
    })

    describe('Step 3: 全機能テスト（5件）', () => {
      beforeEach(async () => {
        // 包括的なテストデータセットを作成
        const books = await Promise.all([
          drizzleService.db
            .insert(schema.books)
            .values({
              title: 'ベストセラー本',
              status: 'completed',
            })
            .returning(),
          drizzleService.db
            .insert(schema.books)
            .values({
              title: '通常本',
              status: 'completed',
            })
            .returning(),
          drizzleService.db
            .insert(schema.books)
            .values({
              title: '新刊本',
              status: 'completed',
            })
            .returning(),
        ])

        // 各書籍の版を作成
        const editions = await Promise.all(
          books.map((bookArr, index) =>
            drizzleService.db
              .insert(schema.editions)
              .values({
                bookId: bookArr[0].id,
                versionName: index === 0 ? '第2版' : '初版',
                versionNumber: index === 0 ? 2 : 1,
                basePrice: 1000 + index * 500,
                isActive: true,
              })
              .returning(),
          ),
        )

        // イベントと保管場所を作成
        const [event] = await drizzleService.db
          .insert(schema.events)
          .values({
            name: '大規模イベント',
            eventDate: '2025-07-20',
            venue: 'ビッグサイト',
            applicationStartDate: '2025-01-01',
            applicationEndDate: '2025-07-01',
          })
          .returning()

        const [location] = await drizzleService.db
          .insert(schema.storageLocations)
          .values({
            name: 'メイン倉庫',
            type: 'warehouse',
            isConsignment: false,
          })
          .returning()

        // 様々なパターンの販売データを作成
        const salesPatterns = [
          // ベストセラー本の大量販売
          {
            editionId: editions[0][0].id,
            quantity: 50,
            unitPrice: 1000,
            transactionDate: new Date('2025-07-20'),
            type: 'event' as const,
            eventId: event.id,
          },
          {
            editionId: editions[0][0].id,
            quantity: 30,
            unitPrice: 1000,
            transactionDate: new Date('2025-07-21'),
            type: 'event' as const,
            eventId: event.id,
          },
          {
            editionId: editions[0][0].id,
            quantity: 20,
            unitPrice: 1000,
            transactionDate: new Date('2025-07-22'),
            type: 'online' as const,
          },
          // 通常本の販売
          {
            editionId: editions[1][0].id,
            quantity: 10,
            unitPrice: 1500,
            transactionDate: new Date('2025-07-20'),
            type: 'event' as const,
            eventId: event.id,
          },
          {
            editionId: editions[1][0].id,
            quantity: 5,
            unitPrice: 1500,
            transactionDate: new Date('2025-07-25'),
            type: 'consignment' as const,
          },
          // 新刊本の販売
          {
            editionId: editions[2][0].id,
            quantity: 15,
            unitPrice: 2000,
            transactionDate: new Date('2025-07-20'),
            type: 'event' as const,
            eventId: event.id,
          },
          {
            editionId: editions[2][0].id,
            quantity: 10,
            unitPrice: 2000,
            transactionDate: new Date('2025-07-28'),
            type: 'direct' as const,
          },
        ]

        for (const sale of salesPatterns) {
          const [transaction] = await drizzleService.db
            .insert(schema.salesTransactions)
            .values({
              transactionType: sale.type,
              eventId: sale.eventId,
              locationId: location.id,
              totalAmount: sale.quantity * sale.unitPrice,
              discountAmount: 0,
              finalAmount: sale.quantity * sale.unitPrice,
              paymentMethod: 'cash',
              transactionDate: sale.transactionDate,
            })
            .returning()

          await drizzleService.db.insert(schema.salesDetails).values({
            transactionId: transaction.id,
            editionId: sale.editionId,
            quantity: sale.quantity,
            unitPrice: sale.unitPrice,
            discountAmount: 0,
            subtotal: sale.quantity * sale.unitPrice,
          })
        }
      })

      it('should display edition ranking correctly', async () => {
        // 版別売上ランキングの正確性テスト
        const response = await request(app.getHttpServer())
          .get('/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // ベストセラー本が1位であることを確認
        expect(response.text).toMatch(/ベストセラー本[\s\S]*?100冊/) // 合計100冊
        expect(response.text).toMatch(/ベストセラー本[\s\S]*?100,000/) // 売上10万円
      })

      it('should generate period-based sales trends', async () => {
        // 期間別売上トレンドのテスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
            groupBy: 'day',
          })
          .expect(200)

        // 期間別データが存在することを確認
        expect(response.body).toHaveProperty('byPeriod')
        expect(response.body.byPeriod.length).toBeGreaterThan(0)

        // 売上が多い日（7/20）のデータを確認
        const july20Data = response.body.byPeriod.find((p: PeriodData) =>
          p.period.includes('2025-07-20'),
        )
        expect(july20Data).toBeDefined()
        expect(july20Data.totalQuantity).toBe(75) // 50 + 10 + 15
        expect(july20Data.totalAmount).toBe(95000) // 50000 + 15000 + 30000
      })

      it('should calculate channel distribution accurately', async () => {
        // 販売チャネル別分析の正確性テスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports')
          .query({
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // チャネル別データの確認
        expect(response.body).toHaveProperty('byChannel')
        const channelData = response.body.byChannel

        // イベント販売が最も多いことを確認
        const eventChannel = channelData.find(
          (c: ChannelData) => c.transactionType === 'event',
        )
        expect(eventChannel).toBeDefined()
        expect(eventChannel.totalQuantity).toBe(105) // 50 + 30 + 10 + 15
        expect(eventChannel.transactionCount).toBe(4)

        // その他のチャネルも存在することを確認
        expect(
          channelData.find((c: ChannelData) => c.transactionType === 'online'),
        ).toBeDefined()
        expect(
          channelData.find(
            (c: ChannelData) => c.transactionType === 'consignment',
          ),
        ).toBeDefined()
        expect(
          channelData.find((c: ChannelData) => c.transactionType === 'direct'),
        ).toBeDefined()
      })

      it('should handle empty result set gracefully', async () => {
        // データがない期間のレポート処理テスト
        const response = await request(app.getHttpServer())
          .get('/sales/reports')
          .query({
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          })
          .expect(200)

        // 0件でも正常に表示されることを確認
        expect(response.text).toContain('総取引数')
        expect(response.text).toContain('<p class="big-number">0</p>')
        expect(response.text).toContain('<p class="unit">件</p>')
        expect(response.text).toContain('総売上金額')
        expect(response.text).toContain('¥0')
      })

      it('should export report data as JSON API', async () => {
        // レポートデータのJSON形式エクスポートテスト
        const response = await request(app.getHttpServer())
          .get('/api/sales/reports/export')
          .query({
            format: 'json',
            startDate: '2025-07-01',
            endDate: '2025-07-31',
          })
          .expect(200)

        // エクスポートデータの構造確認
        expect(response.type).toBe('application/json')
        expect(response.body).toHaveProperty('metadata')
        expect(response.body.metadata).toHaveProperty('generatedAt')
        expect(response.body.metadata).toHaveProperty('filters')
        expect(response.body).toHaveProperty('data')
        expect(response.body.data).toHaveProperty('summary')
        expect(response.body.data).toHaveProperty('details')
      })
    })
  })
})
