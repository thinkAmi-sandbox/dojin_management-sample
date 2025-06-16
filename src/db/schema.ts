import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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

export const authors = pgTable('Author', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  bio: text('bio'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Author = typeof authors.$inferSelect
export type NewAuthor = typeof authors.$inferInsert

export const bookAuthors = pgTable(
  'BookAuthor',
  {
    bookId: integer('bookId')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    authorId: integer('authorId')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.bookId, table.authorId] }),
  }),
)

export type BookAuthor = typeof bookAuthors.$inferSelect
export type NewBookAuthor = typeof bookAuthors.$inferInsert
