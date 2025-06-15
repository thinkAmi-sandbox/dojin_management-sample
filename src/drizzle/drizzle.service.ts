import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool
  public db: NodePgDatabase<typeof schema>

  onModuleInit() {
    const databaseUrl = this.getDatabaseUrl()
    this.pool = new Pool({
      connectionString: databaseUrl,
    })
    this.db = drizzle(this.pool, { schema })
  }

  private getDatabaseUrl(): string {
    if (process.env.NODE_ENV === 'test') {
      return process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    }
    return process.env.DATABASE_URL
  }

  async onModuleDestroy() {
    await this.pool.end()
  }
}
