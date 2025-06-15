import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../../src/db/schema'

/**
 * テスト用データベースクリーンアップヘルパー
 * 全てのテーブルのデータを削除する
 */
export async function cleanupDatabase(
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  // 全テーブルのデータを削除（強制実行）
  // 外部キー制約がある場合は依存関係を考慮した順序で削除
  await db.delete(schema.books).execute()

  // 将来的に他のテーブルが追加された場合はここに追加
  // await db.delete(schema.authors).execute()
  // await db.delete(schema.categories).execute()

  // 削除を確実にするため少し待機
  await new Promise((resolve) => setTimeout(resolve, 10))
}

/**
 * テスト用データベース初期化
 * beforeEachで呼び出してデータベースを確実にクリーンな状態にする
 */
export async function initializeTestDatabase(
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  // 強制的にすべてのデータを削除
  await db.delete(schema.books).execute()

  // 削除を確実にするため少し待機
  await new Promise((resolve) => setTimeout(resolve, 10))
}
