import * as dotenv from 'dotenv'
import { testDbUtils } from '../helpers/db-utils'

// 環境変数を読み込み
dotenv.config()

export async function setupGlobalDatabase() {
  console.log('Setting up global test database...')

  // testDbUtilsを使用して全テーブルをクリーンアップ
  await testDbUtils.cleanupDatabase()

  console.log('Global test database setup complete')
}

export async function teardownGlobalDatabase() {
  console.log('Tearing down global test database...')

  // testDbUtilsを使用して全テーブルをクリーンアップ
  await testDbUtils.cleanupDatabase()
  await testDbUtils.closeConnection()

  console.log('Global test database teardown complete')
}

// Vitestのglobal setup/teardownで使用
export default async function globalSetup() {
  await setupGlobalDatabase()

  return async () => {
    await teardownGlobalDatabase()
  }
}
