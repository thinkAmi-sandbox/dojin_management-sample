import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../../src/db/schema'

export class TestDbUtils {
  private pool: Pool
  private db: ReturnType<typeof drizzle>
  public schema = schema // スキーマをpublicプロパティとして公開

  constructor() {
    const databaseUrl =
      process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    this.pool = new Pool({ connectionString: databaseUrl })
    this.db = drizzle(this.pool, { schema })
  }

  async cleanupDatabase(): Promise<void> {
    try {
      await this.db.execute(sql`TRUNCATE TABLE "Book" RESTART IDENTITY CASCADE`)
      // Deadlineテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Deadline" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Authorテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Author" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // BookAuthorテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "BookAuthor" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // PrintingCompanyテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "PrintingCompany" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Submissionテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Submission" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Eventテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Event" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Circleテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Circle" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Exhibitテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Exhibit" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // ExhibitBookテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "ExhibitBook" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // CircleAuthorテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "CircleAuthor" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Editionテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Edition" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // StorageLocationテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "StorageLocation" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Stockテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Stock" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // StockMovementテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "StockMovement" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // Consignmentテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "Consignment" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // ConsignmentSalesテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "ConsignmentSales" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
      // ConsignmentSalesDetailテーブルが存在する場合のみTRUNCATEを実行
      try {
        await this.db.execute(
          sql`TRUNCATE TABLE "ConsignmentSalesDetail" RESTART IDENTITY CASCADE`,
        )
      } catch {
        // テーブルが存在しない場合は無視
      }
    } catch (error) {
      console.error(
        'データベースのクリーンアップでエラーが発生しました:',
        error,
      )
      throw error
    }
  }

  async cleanupRelationalData(): Promise<void> {
    try {
      // 中間テーブルのみクリーンアップ（基本データは残す）
      try {
        await this.db.execute(sql`DELETE FROM "BookAuthor"`)
      } catch {
        // テーブルが存在しない場合は無視
      }
      try {
        await this.db.execute(sql`DELETE FROM "Deadline"`)
      } catch {
        // テーブルが存在しない場合は無視
      }
    } catch (error) {
      console.error('関連データのクリーンアップでエラーが発生しました:', error)
      throw error
    }
  }

  async cleanupDeadlines(): Promise<void> {
    try {
      // Deadlineテーブルのみクリーンアップ
      try {
        await this.db.execute(sql`DELETE FROM "Deadline"`)
      } catch {
        // テーブルが存在しない場合は無視
      }
    } catch (error) {
      console.error('締切データのクリーンアップでエラーが発生しました:', error)
      throw error
    }
  }

  async closeConnection(): Promise<void> {
    await this.pool.end()
  }

  getDb() {
    return this.db
  }

  // テストユーティリティ関数を追加
  async createTestAuthor(data?: Partial<schema.NewAuthor>) {
    const [author] = await this.db
      .insert(schema.authors)
      .values({
        name: data?.name || 'テスト著者',
        email: data?.email || 'test@example.com',
        bio: data?.bio || 'テスト著者の紹介',
        ...data,
      })
      .returning()
    return author
  }

  async createTestBook(data?: Partial<schema.NewBook>) {
    const [book] = await this.db
      .insert(schema.books)
      .values({
        title: data?.title || 'テスト書籍',
        subtitle: data?.subtitle,
        description: data?.description,
        genre: data?.genre,
        seriesName: data?.seriesName,
        seriesNumber: data?.seriesNumber,
        status: data?.status || 'planning',
        ...data,
      })
      .returning()
    return book
  }

  async createTestEdition(bookId: number, data?: Partial<schema.NewEdition>) {
    const [edition] = await this.db
      .insert(schema.editions)
      .values({
        bookId,
        versionName: data?.versionName || '初版',
        versionNumber: data?.versionNumber || 1,
        basePrice: data?.basePrice || 1000,
        isActive: data?.isActive ?? true,
        ...data,
      })
      .returning()
    return edition
  }

  async createTestStorageLocation(data?: Partial<schema.NewStorageLocation>) {
    const [location] = await this.db
      .insert(schema.storageLocations)
      .values({
        name: data?.name || 'テスト保管場所',
        type: data?.type || 'home',
        isConsignment: data?.isConsignment ?? false,
        address: data?.address,
        contactInfo: data?.contactInfo,
        notes: data?.notes,
        ...data,
      })
      .returning()
    return location
  }

  async createTestConsignment(data?: Partial<schema.NewConsignment>) {
    const [consignment] = await this.db
      .insert(schema.consignments)
      .values({
        locationId: data?.locationId || 1,
        storeName: data?.storeName || 'テスト書店',
        commissionRate: data?.commissionRate || 30,
        contractStartDate: data?.contractStartDate || new Date('2025-01-01'),
        isActive: data?.isActive ?? true,
        ...data,
      })
      .returning()
    return consignment
  }

  async createTestStock(data: {
    editionId: number
    locationId: number
    quantity: number
    availableQuantity: number
  }) {
    const [stock] = await this.db.insert(schema.stocks).values(data).returning()
    return stock
  }

  async createTestConsignmentSalesReport(data: {
    consignmentId: number
    totalSalesAmount: number
    reportPeriodStart?: Date
    reportPeriodEnd?: Date
    status?: string
  }) {
    const commissionAmount = Math.floor(data.totalSalesAmount * 0.3) // 30%と仮定
    const netAmount = data.totalSalesAmount - commissionAmount

    const [salesReport] = await this.db
      .insert(schema.consignmentSales)
      .values({
        consignmentId: data.consignmentId,
        totalSalesAmount: data.totalSalesAmount,
        commissionAmount,
        netAmount,
        reportPeriodStart: data.reportPeriodStart || new Date('2025-01-01'),
        reportPeriodEnd: data.reportPeriodEnd || new Date('2025-01-31'),
        status: (data.status || 'reported') as
          | 'reported'
          | 'confirmed'
          | 'adjusted'
          | 'settled',
      })
      .returning()
    return salesReport
  }

  get drizzleDb() {
    return this.db
  }
}

export const testDbUtils = new TestDbUtils()
