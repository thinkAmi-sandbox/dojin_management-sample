import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../../../src/app.module'
import { books, printingCompanies, submissions } from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('Submissions Show Navigation (Integration)', () => {
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

    // テスト用書籍データ作成
    await drizzleService.db.insert(books).values({
      id: 1,
      title: 'テスト書籍',
      subtitle: 'テストサブタイトル',
      description: 'テスト説明',
      status: 'planning',
    })

    // テスト用印刷所データ作成
    await drizzleService.db.insert(printingCompanies).values({
      id: 1,
      name: 'テスト印刷所',
      websiteUrl: 'https://test-printing.com',
    })

    // テスト用入稿データ作成
    await drizzleService.db.insert(submissions).values({
      id: 1,
      bookId: 1,
      printingCompanyId: 1,
      status: 'draft',
      quantity: 100,
      submissionDate: new Date('2024-01-15'),
      expectedDeliveryDate: new Date('2024-02-01'),
      printingCost: 50000,
      shippingCost: 1500,
      otherCost: 1000,
      totalCost: 52500,
      specificationNotes: 'テスト仕様メモ',
      deliveryDestination: 'テスト配送先',
      submissionFileNotes: 'テストファイルメモ',
      generalNotes: 'テスト全般メモ',
    })
  })

  describe('入稿詳細ページの段階的更新ナビゲーション', () => {
    it('ステータス変更ボタンが存在すること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      // ステータス変更ボタンの存在確認
      expect(response.text).toContain('📊 ステータス変更')
      expect(response.text).toContain('href="/submissions/1/status/edit"')
      expect(response.text).toContain('ステータスを素早く変更します')
    })

    it('コスト更新ボタンが存在すること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      // コスト更新ボタンの存在確認
      expect(response.text).toContain('💰 コスト更新')
      expect(response.text).toContain('href="/submissions/1/costs/edit"')
      expect(response.text).toContain('コスト情報を更新します')
    })

    it('ボタンが適切な順序で配置されていること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      const html = response.text

      // ボタンの配置順序確認
      const listButtonIndex = html.indexOf('一覧に戻る')
      const historyButtonIndex = html.indexOf('書籍の入稿履歴')
      const statusButtonIndex = html.indexOf('📊 ステータス変更')
      const costButtonIndex = html.indexOf('💰 コスト更新')
      const editButtonIndex = html.indexOf('編集')
      const deleteButtonIndex = html.indexOf('削除')

      // 期待される順序
      expect(listButtonIndex).toBeLessThan(historyButtonIndex)
      expect(historyButtonIndex).toBeLessThan(statusButtonIndex)
      expect(statusButtonIndex).toBeLessThan(costButtonIndex)
      expect(costButtonIndex).toBeLessThan(editButtonIndex)
      expect(editButtonIndex).toBeLessThan(deleteButtonIndex)
    })

    it('ステータス変更ボタンに適切なスタイルが適用されていること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      // オレンジ系の背景色が適用されていることを確認
      expect(response.text).toContain('#fd7e14')
    })

    it('コスト更新ボタンに適切なスタイルが適用されていること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      // 紫系の背景色が適用されていることを確認
      expect(response.text).toContain('#6f42c1')
    })

    it('既存のボタンが正常に表示されていること', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/1')
        .expect(200)

      // 既存ボタンの存在確認
      expect(response.text).toContain('一覧に戻る')
      expect(response.text).toContain('書籍の入稿履歴')
      expect(response.text).toContain('編集')
      expect(response.text).toContain('削除')
    })
  })
})
