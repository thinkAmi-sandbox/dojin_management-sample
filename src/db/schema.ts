import {
  boolean,
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

export const circleRoleEnum = pgEnum('circle_role', [
  'representative',
  'member',
  'guest',
])

export const storageLocationTypeEnum = pgEnum('storage_location_type', [
  'home',
  'warehouse',
  'consignment',
  'event',
])

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'inbound', // 入庫（印刷所から納品）
  'outbound', // 出庫（イベント/委託先へ）
  'transfer', // 移動（場所間移動）
  'sale', // 販売による減少
  'return', // 返品による増加
  'adjustment', // 棚卸調整
  'disposal', // 廃棄
])

export const salesTransactionTypeEnum = pgEnum('sales_transaction_type', [
  'event', // イベント直販
  'consignment', // 委託販売
  'online', // オンライン販売
  'direct', // 個人間直接販売
])

export const pricingRuleTypeEnum = pgEnum('pricing_rule_type', [
  'event_discount', // イベント割引
  'bulk_discount', // まとめ買い割引
  'early_bird', // 早期割引
  'consignment', // 委託販売価格
])

export const books = pgTable('Book', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  description: text('description'),
  genre: varchar('genre', { length: 100 }), // ジャンル（全版共通）
  seriesName: varchar('seriesName', { length: 255 }), // シリーズ名
  seriesNumber: integer('seriesNumber'), // シリーズ内番号
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

export const exhibitBooks = pgTable(
  'ExhibitBook',
  {
    exhibitId: integer('exhibitId')
      .notNull()
      .references(() => exhibits.id, { onDelete: 'cascade' }),
    editionId: integer('editionId')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    plannedQuantity: integer('plannedQuantity').notNull().default(0),
    actualQuantity: integer('actualQuantity'), // 新規追加：実際の持ち込み数
    soldQuantity: integer('soldQuantity'), // 新規追加：売上数
    remainingQuantity: integer('remainingQuantity'), // 新規追加：残数
    price: integer('price').notNull().default(0), // 既存フィールド名を維持
    displayOrder: integer('displayOrder').notNull().default(0),
    createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exhibitId, table.editionId] }), // 複合主キー変更
  }),
)

export type ExhibitBook = typeof exhibitBooks.$inferSelect
export type NewExhibitBook = typeof exhibitBooks.$inferInsert

export const circleAuthors = pgTable(
  'CircleAuthor',
  {
    circleId: integer('circleId')
      .notNull()
      .references(() => circles.id, { onDelete: 'cascade' }),
    authorId: integer('authorId')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
    role: circleRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joinedAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    leftAt: timestamp('leftAt', { mode: 'date', precision: 3 }),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.circleId, table.authorId] }),
  }),
)

export type CircleAuthor = typeof circleAuthors.$inferSelect
export type NewCircleAuthor = typeof circleAuthors.$inferInsert

export const editions = pgTable('Edition', {
  id: serial('id').primaryKey(),
  bookId: integer('bookId')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  versionName: varchar('versionName', { length: 100 }).notNull(), // "初版", "第2版", "新装版"等
  versionNumber: integer('versionNumber').notNull().default(1), // 版番号（ソート用）
  isbn: varchar('isbn', { length: 13 }).unique(), // ISBN（版ごとに異なる）

  // 版ごとに変わる可能性のある情報
  pageCount: integer('pageCount'),
  basePrice: integer('basePrice').notNull(), // 基本価格（定価）
  printingCost: integer('printingCost'), // 印刷原価
  publishDate: date('publishDate'), // 発行日

  // 版の詳細情報
  editionNotes: text('editionNotes'), // 改訂内容、追加内容等
  coverImageUrl: varchar('coverImageUrl', { length: 500 }), // 表紙画像（版で異なる場合）

  // ステータス
  isActive: boolean('isActive').notNull().default(true), // 現行版かどうか
  isSoldOut: boolean('isSoldOut').notNull().default(false), // 完売フラグ

  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Edition = typeof editions.$inferSelect
export type NewEdition = typeof editions.$inferInsert

export const storageLocations = pgTable('StorageLocation', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: storageLocationTypeEnum('type').notNull(),
  isConsignment: boolean('isConsignment').notNull().default(false),
  address: text('address'),
  contactInfo: text('contactInfo'),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type StorageLocation = typeof storageLocations.$inferSelect
export type NewStorageLocation = typeof storageLocations.$inferInsert

export const stocks = pgTable('Stock', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  locationId: integer('locationId')
    .notNull()
    .references(() => storageLocations.id),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reservedQuantity').notNull().default(0), // 予約済み数量
  availableQuantity: integer('availableQuantity').notNull().default(0), // 販売可能数量
  lastCheckedAt: timestamp('lastCheckedAt', { mode: 'date', precision: 3 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Stock = typeof stocks.$inferSelect
export type NewStock = typeof stocks.$inferInsert

export const stockMovements = pgTable('StockMovement', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  fromLocationId: integer('fromLocationId').references(
    () => storageLocations.id,
  ),
  toLocationId: integer('toLocationId').references(() => storageLocations.id),
  quantity: integer('quantity').notNull(),
  movementType: stockMovementTypeEnum('movementType').notNull(),
  referenceType: varchar('referenceType', { length: 50 }), // 'sale', 'exhibit', 'consignment'
  referenceId: integer('referenceId'), // 関連するレコードのID
  reason: text('reason'),
  movedAt: timestamp('movedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  createdBy: varchar('createdBy', { length: 255 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
})

export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert

export const salesTransactions = pgTable('SalesTransaction', {
  id: serial('id').primaryKey(),
  transactionType: salesTransactionTypeEnum('transactionType').notNull(),
  eventId: integer('eventId').references(() => events.id),
  exhibitId: integer('exhibitId').references(() => exhibits.id),
  locationId: integer('locationId').references(() => storageLocations.id),
  customerName: varchar('customerName', { length: 255 }),
  customerEmail: varchar('customerEmail', { length: 255 }),
  totalAmount: integer('totalAmount').notNull(),
  discountAmount: integer('discountAmount').default(0),
  finalAmount: integer('finalAmount').notNull(),
  paymentMethod: varchar('paymentMethod', { length: 50 }),
  transactionDate: timestamp('transactionDate', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type SalesTransaction = typeof salesTransactions.$inferSelect
export type NewSalesTransaction = typeof salesTransactions.$inferInsert

export const salesDetails = pgTable('SalesDetail', {
  id: serial('id').primaryKey(),
  transactionId: integer('transactionId')
    .notNull()
    .references(() => salesTransactions.id, { onDelete: 'cascade' }),
  editionId: integer('editionId')
    .notNull()
    .references(() => editions.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(),
  discountAmount: integer('discountAmount').default(0),
  subtotal: integer('subtotal').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
})

export type SalesDetail = typeof salesDetails.$inferSelect
export type NewSalesDetail = typeof salesDetails.$inferInsert

export const pricingRules = pgTable('PricingRule', {
  id: serial('id').primaryKey(),
  editionId: integer('editionId')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  ruleType: pricingRuleTypeEnum('ruleType').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price'), // 固定価格の場合
  discountRate: integer('discountRate'), // 割引率（%）の場合
  minQuantity: integer('minQuantity'), // 最小購入数（まとめ買い用）
  eventId: integer('eventId').references(() => events.id), // イベント限定価格
  validFrom: date('validFrom'),
  validUntil: date('validUntil'),
  priority: integer('priority').notNull().default(0), // 優先順位
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type PricingRule = typeof pricingRules.$inferSelect
export type NewPricingRule = typeof pricingRules.$inferInsert
