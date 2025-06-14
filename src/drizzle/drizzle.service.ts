import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool
  public db: NodePgDatabase<typeof schema>

  onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
    this.db = drizzle(this.pool, { schema })
  }

  async onModuleDestroy() {
    await this.pool.end()
  }
}
