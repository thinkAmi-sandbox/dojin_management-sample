import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../../src/db/schema'

export class TestDbUtils {
  private pool: Pool
  private db: ReturnType<typeof drizzle>

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
}

export const testDbUtils = new TestDbUtils()
