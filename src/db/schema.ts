import {
  date,
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

export const exhibitStatusEnum = pgEnum('exhibit_status', [
  'applied',
  'accepted',
  'rejected',
  'cancelled',
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

export const printingCompanies = pgTable('PrintingCompany', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  websiteUrl: varchar('websiteUrl', { length: 500 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type PrintingCompany = typeof printingCompanies.$inferSelect
export type NewPrintingCompany = typeof printingCompanies.$inferInsert

export const submissions = pgTable('Submission', {
  id: serial('id').primaryKey(),

  // 基本情報
  bookId: integer('bookId')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  printingCompanyId: integer('printingCompanyId')
    .notNull()
    .references(() => printingCompanies.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),

  // 日付管理
  submissionDate: timestamp('submissionDate', { mode: 'date', precision: 3 }),
  expectedDeliveryDate: timestamp('expectedDeliveryDate', {
    mode: 'date',
    precision: 3,
  }),
  actualDeliveryDate: timestamp('actualDeliveryDate', {
    mode: 'date',
    precision: 3,
  }),

  // 印刷情報
  quantity: integer('quantity').notNull(),
  specificationNotes: text('specificationNotes'),

  // コスト情報
  printingCost: integer('printingCost'),
  shippingCost: integer('shippingCost'),
  otherCost: integer('otherCost'),
  totalCost: integer('totalCost'),
  discountType: varchar('discountType', { length: 50 }),

  // 配送情報
  deliveryDestination: varchar('deliveryDestination', { length: 255 }),
  deliveryNotes: text('deliveryNotes'),

  // その他
  submissionFileNotes: text('submissionFileNotes'),
  generalNotes: text('generalNotes'),

  // タイムスタンプ
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert

export const events = pgTable('Event', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  eventDate: date('eventDate').notNull(),
  venue: varchar('venue', { length: 255 }).notNull(),
  applicationStartDate: date('applicationStartDate').notNull(),
  applicationEndDate: date('applicationEndDate').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

export const circles = pgTable('Circle', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  representativeName: varchar('representativeName', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Circle = typeof circles.$inferSelect
export type NewCircle = typeof circles.$inferInsert

export const exhibits = pgTable('Exhibit', {
  id: serial('id').primaryKey(),
  eventId: integer('eventId')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  circleId: integer('circleId')
    .notNull()
    .references(() => circles.id, { onDelete: 'cascade' }),
  status: exhibitStatusEnum('status').notNull().default('applied'),
  applicationDate: timestamp('applicationDate', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  resultDate: timestamp('resultDate', { mode: 'date', precision: 3 }),
  spaceNumber: varchar('spaceNumber', { length: 50 }),
  spaceType: varchar('spaceType', { length: 50 }),
  applicationNotes: text('applicationNotes'),
  resultNotes: text('resultNotes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Exhibit = typeof exhibits.$inferSelect
export type NewExhibit = typeof exhibits.$inferInsert
