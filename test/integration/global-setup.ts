import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import * as schema from '../../src/db/schema'

// 環境変数を読み込み
dotenv.config()

let globalPool: Pool
let globalDb: ReturnType<typeof drizzle>

export async function setupGlobalDatabase() {
  console.log('Setting up global test database...')

  globalPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  globalDb = drizzle(globalPool, { schema })

  // テスト開始前に全データを削除
  await globalDb.delete(schema.books)

  console.log('Global test database setup complete')
}

export async function teardownGlobalDatabase() {
  console.log('Tearing down global test database...')

  if (globalDb && globalPool) {
    // テスト終了後も全データを削除
    await globalDb.delete(schema.books)
    await globalPool.end()
  }

  console.log('Global test database teardown complete')
}

// Vitestのglobal setup/teardownで使用
export default async function globalSetup() {
  await setupGlobalDatabase()

  return async () => {
    await teardownGlobalDatabase()
  }
}
