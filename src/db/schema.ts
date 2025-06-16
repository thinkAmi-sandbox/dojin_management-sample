import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const writingStatusEnum = pgEnum('writing_status', [
  'planning',
  'writing',
  'editing',
  'completed',
])

export const books = pgTable('Book', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  description: text('description'),
  pageCount: integer('pageCount'),
  status: writingStatusEnum('status').notNull().default('planning'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert

export const deadlines = pgTable('Deadline', {
  id: serial('id').primaryKey(),
  bookId: integer('bookId')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  dueDate: timestamp('dueDate', { mode: 'date', precision: 3 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Deadline = typeof deadlines.$inferSelect
export type NewDeadline = typeof deadlines.$inferInsert
