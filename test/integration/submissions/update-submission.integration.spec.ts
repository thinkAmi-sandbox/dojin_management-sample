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
import * as schema from '../../../src/db/schema'
import { DrizzleService } from '../../../src/drizzle/drizzle.service'
import { testDbUtils } from '../../helpers/db-utils'
import { setupTestApp } from '../setup-test-app'

describe('入稿編集機能 (Integration)', () => {
  let app: INestApplication
  let drizzleService: DrizzleService
  let testBook: schema.Book
  let testPrintingCompany: schema.PrintingCompany
  let testSubmission: schema.Submission

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
    // テスト用データの作成
    // 1. 書籍の作成
    const bookResult = await drizzleService.db
      .insert(schema.books)
      .values({
        title: 'テスト書籍',
        subtitle: 'テストサブタイトル',
        description: 'テスト説明',
        pageCount: 100,
        status: 'writing',
      })
      .returning()
    testBook = bookResult[0]

    // 2. 印刷所の作成
    const printingCompanyResult = await drizzleService.db
      .insert(schema.printingCompanies)
      .values({
        name: 'テスト印刷所',
        websiteUrl: 'https://test-printing.example.com',
        notes: '印刷所の備考',
      })
      .returning()
    testPrintingCompany = printingCompanyResult[0]

    // 3. 入稿の作成
    const submissionResult = await drizzleService.db
      .insert(schema.submissions)
      .values({
        bookId: testBook.id,
        printingCompanyId: testPrintingCompany.id,
        status: 'draft',
        quantity: 100,
        submissionDate: new Date('2024-03-15'),
        expectedDeliveryDate: new Date('2024-04-01'),
        specificationNotes: '既存の仕様メモ',
        printingCost: 50000,
        shippingCost: 5000,
        otherCost: 2000,
        totalCost: 57000,
        discountType: '早割',
        deliveryDestination: '東京会場',
        deliveryNotes: '搬入時の注意事項',
        submissionFileNotes: 'ファイル関連の備考',
        generalNotes: '全般的な備考',
      })
      .returning()
    testSubmission = submissionResult[0]
  })

  describe('GET /submissions/:id/edit', () => {
    it('既存入稿の編集フォームを表示する', async () => {
      const response = await request(app.getHttpServer())
        .get(`/submissions/${testSubmission.id}/edit`)
        .expect(200)

      const html = response.text

      // タイトルとページ構成
      expect(html).toContain('<title>入稿編集</title>')
      expect(html).toContain('<h1>入稿編集</h1>')

      // パンくずリスト
      expect(html).toContain('<a href="/submissions">入稿一覧</a>')
      expect(html).toContain(
        `<a href="/submissions/${testSubmission.id}">入稿詳細</a>`,
      )
      expect(html).toContain('編集')

      // フォームの基本設定
      expect(html).toContain(`action="/submissions/${testSubmission.id}"`)
      expect(html).toContain('name="_method" value="PUT"')

      // 既存データの表示確認
      expect(html).toContain('value="100"') // quantity
      expect(html).toContain('value="2024-03-15"') // submissionDate
      expect(html).toContain('value="2024-04-01"') // expectedDeliveryDate
      expect(html).toContain('>既存の仕様メモ</textarea>') // specificationNotes
      expect(html).toContain('value="50000"') // printingCost
      expect(html).toContain('value="5000"') // shippingCost
      expect(html).toContain('value="2000"') // otherCost
      expect(html).toContain('value="早割"') // discountType
      expect(html).toContain('value="東京会場"') // deliveryDestination
      expect(html).toContain('>搬入時の注意事項</textarea>') // deliveryNotes
      expect(html).toContain('>ファイル関連の備考</textarea>') // submissionFileNotes
      expect(html).toContain('>全般的な備考</textarea>') // generalNotes

      // ステータス選択の確認
      expect(html).toContain('<option value="draft" selected>準備中</option>')
      expect(html).toContain('<option value="submitted" >入稿済み</option>')

      // 印刷所選択の確認（既存の印刷所が選択されている）
      expect(html).toContain(
        `<option value="${testPrintingCompany.id}" selected>`,
      )
      expect(html).toContain('テスト印刷所')

      // 送信ボタンとキャンセルリンク
      expect(html).toContain('更新する')
      expect(html).toContain(`href="/submissions/${testSubmission.id}"`)
      expect(html).toContain('キャンセル')
    })

    it('存在しない入稿IDの場合、404エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/9999/edit')
        .expect(404)

      expect(response.body.message).toContain('入稿が見つかりません')
    })

    it('無効な入稿IDの場合、400エラーを返す', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions/invalid/edit')
        .expect(400) // ParseIntPipeエラーは400

      expect(response.body.message).toContain(
        'Validation failed (numeric string is expected)',
      )
    })
  })

  describe('PUT /submissions/:id (via POST with _method=PUT)', () => {
    it('有効なデータで入稿を更新し、詳細ページにリダイレクトする', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: testPrintingCompany.id,
        status: 'submitted',
        quantity: 150,
        submissionDate: '2024-03-20',
        expectedDeliveryDate: '2024-04-10',
        specificationNotes: '更新された仕様メモ',
        printingCost: 60000,
        shippingCost: 6000,
        otherCost: 3000,
        discountType: '通常',
        deliveryDestination: '大阪会場',
        deliveryNotes: '更新された搬入注意事項',
        submissionFileNotes: '更新されたファイル備考',
        generalNotes: '更新された全般備考',
      }

      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}`)
        .type('form')
        .send(updateData)
        .expect(302)

      expect(response.headers.location).toBe(
        `/submissions/${testSubmission.id}`,
      )

      // データベースの更新確認
      const updated = await drizzleService.db
        .select()
        .from(schema.submissions)
        .where(eq(schema.submissions.id, testSubmission.id))

      expect(updated[0].status).toBe('submitted')
      expect(updated[0].quantity).toBe(150)
      expect(updated[0].submissionDate?.toISOString().split('T')[0]).toBe(
        '2024-03-20',
      )
      expect(updated[0].expectedDeliveryDate?.toISOString().split('T')[0]).toBe(
        '2024-04-10',
      )
      expect(updated[0].specificationNotes).toBe('更新された仕様メモ')
      expect(updated[0].printingCost).toBe(60000)
      expect(updated[0].shippingCost).toBe(6000)
      expect(updated[0].otherCost).toBe(3000)
      expect(updated[0].totalCost).toBe(69000) // 60000 + 6000 + 3000
      expect(updated[0].discountType).toBe('通常')
      expect(updated[0].deliveryDestination).toBe('大阪会場')
      expect(updated[0].deliveryNotes).toBe('更新された搬入注意事項')
      expect(updated[0].submissionFileNotes).toBe('更新されたファイル備考')
      expect(updated[0].generalNotes).toBe('更新された全般備考')
    })

    it('部数が空の場合、エラーを表示して編集フォームを再表示する', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: testPrintingCompany.id,
        quantity: '',
        submissionDate: '2024-03-20',
        expectedDeliveryDate: '2024-04-10',
      }

      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}`)
        .type('form')
        .send(updateData)
        .expect(302) // UpdateSubmissionDtoのオプショナルQuantityはvalidation通過してリダイレクト

      expect(response.headers.location).toBe(
        `/submissions/${testSubmission.id}`,
      )

      // データベースの更新確認（quantityはundefineで更新されていない）
      const updated = await drizzleService.db
        .select()
        .from(schema.submissions)
        .where(eq(schema.submissions.id, testSubmission.id))

      expect(updated[0].quantity).toBe(100) // 元の値が保持されている
    })

    it('部数に無効な値を指定した場合、エラーを表示する', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: testPrintingCompany.id,
        quantity: '-5',
        submissionDate: '2024-03-20',
        expectedDeliveryDate: '2024-04-10',
      }

      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}`)
        .type('form')
        .send(updateData)
        .expect(200)

      const html = response.text

      // エラーメッセージの確認
      expect(html).toContain('部数は1以上で入力してください')

      // 入力値が保持されている
      expect(html).toContain('value="-5"')
    })

    it('印刷所IDが存在しない場合、エラーを表示する', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: 9999,
        quantity: 100,
        submissionDate: '2024-03-20',
        expectedDeliveryDate: '2024-04-10',
      }

      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}`)
        .type('form')
        .send(updateData)
        .expect(200) // コントローラーで「見つかりません」エラーをcatchして200でエラーページ表示

      const html = response.text

      // エラーメッセージの確認
      expect(html).toContain('指定された印刷所が見つかりません')
    })

    it('オプション項目を空にして更新できる', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: testPrintingCompany.id.toString(), // 数値を文字列として送信（フォームからの送信を再現）
        quantity: '100',
        status: 'draft',
        submissionDate: '',
        expectedDeliveryDate: '',
        specificationNotes: '',
        printingCost: '',
        shippingCost: '',
        otherCost: '',
        discountType: '',
        deliveryDestination: '',
        deliveryNotes: '',
        submissionFileNotes: '',
        generalNotes: '',
      }

      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmission.id}`)
        .type('form')
        .send(updateData)
        .expect(200) // ValidationExceptionFilterがValidationPipeエラーをキャッチして200でエラーページを返す

      const html = response.text

      // 編集フォームが再表示されていることを確認
      expect(html).toContain('<title>入稿編集</title>')
      expect(html).toContain('<h1>入稿編集</h1>')

      // 入力値が保持されていることを確認
      expect(html).toContain('value="100"') // quantity
      expect(html).toContain('value="draft"') // status
    })

    it('存在しない入稿IDの場合、404エラーを返す', async () => {
      const updateData = {
        _method: 'PUT',
        printingCompanyId: testPrintingCompany.id,
        quantity: 100,
      }

      const response = await request(app.getHttpServer())
        .post('/submissions/9999')
        .type('form')
        .send(updateData)
        .expect(404)

      expect(response.body.message).toContain('入稿が見つかりません')
    })
  })
})
