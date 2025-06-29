# Phase 3: 既存機能の版対応実装計画

## 📋 Phase 3 概要

Phase 3では、既存の同人誌管理機能を版ベース管理に対応させます。主にExhibitBooksテーブルの版対応と、既存データの移行を実装し、Phase 1-2で構築した版管理・在庫管理基盤との統合を図ります。

### 🎯 Phase 3の目標
- **ExhibitBooksテーブルの版対応**: bookIdからeditionIdへの変更
- **既存データの安全な移行**: 現在の書籍データから初版データの自動生成
- **既存機能の版対応**: 出展管理画面の版ベース表示への変更
- **データ整合性保証**: 移行前後でのデータ一貫性確保

### 🏗️ 実装戦略
- **段階的移行**: 新機能追加→データ移行→旧機能廃止の順で安全に実装
- **後方互換性**: 移行期間中の既存機能継続動作
- **データバックアップ**: 移行前の完全バックアップ取得
- **検証プロセス**: 移行後のデータ整合性徹底確認

## 📊 Phase 3 実装スケジュール

### ✅ Phase 3-1: ExhibitBooksテーブル版対応（完全完了）- 2025年6月29日実装完了 ✅
### ⏳ Phase 3-2: データマイグレーション実装（1-2日）
### ⏳ Phase 3-3: 既存機能の版対応（1週間）
### ⏳ Phase 3-4: 統合テスト・検証（2-3日）

## 🗂️ Phase 3-1: ExhibitBooksテーブル版対応（2-3日）

### 現在のExhibitBooksテーブル（実装状況分析結果）
```typescript
// 実際の現在の実装 (schema.ts:266-289)
export const exhibitBooks = pgTable(
  'ExhibitBook',
  {
    exhibitId: integer('exhibitId').notNull().references(() => exhibits.id, { onDelete: 'cascade' }),
    bookId: integer('bookId').notNull().references(() => books.id, { onDelete: 'cascade' }),
    plannedQuantity: integer('plannedQuantity').notNull().default(0),
    price: integer('price').notNull().default(0), // actualPriceではなくprice
    displayOrder: integer('displayOrder').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exhibitId, table.bookId] }), // 複合主キー
  }),
)
```

### 版対応後のExhibitBooksテーブル（修正版）
```typescript
// 版対応後の実装（実際の構造に基づく修正版）
export const exhibitBooks = pgTable(
  'ExhibitBook',
  {
    exhibitId: integer('exhibitId').notNull().references(() => exhibits.id, { onDelete: 'cascade' }),
    editionId: integer('editionId').notNull().references(() => editions.id, { onDelete: 'cascade' }), // 新規追加
    bookId: integer('bookId').references(() => books.id, { onDelete: 'cascade' }), // 移行期間中は残す
    plannedQuantity: integer('plannedQuantity').notNull().default(0),
    actualQuantity: integer('actualQuantity'), // 新規追加：実際の持ち込み数
    soldQuantity: integer('soldQuantity'), // 新規追加：売上数
    remainingQuantity: integer('remainingQuantity'), // 新規追加：残数
    price: integer('price').notNull().default(0), // 既存フィールド名を維持
    displayOrder: integer('displayOrder').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exhibitId, table.editionId] }), // 複合主キー変更
  }),
)
```

### 修正が必要な計画項目（実装分析結果）

#### 1. スキーマ構造の相違点
**計画書の想定**: serial主キー + 単一制約  
**実際の構造**: 複合主キー (exhibitId, bookId)  
**対応方針**: 複合主キーを (exhibitId, editionId) に変更

#### 2. フィールド名の相違点
**計画書**: `actualPrice`  
**実際**: `price`  
**対応方針**: 既存の`price`フィールドを維持

#### 3. 新規フィールドの追加
- `editionId`: integer型（editionsテーブルへの外部キー）
- `actualQuantity`: integer型（実際の持ち込み数）
- `soldQuantity`: integer型（売上数）  
- `remainingQuantity`: integer型（残数）

### 追加フィールドの説明
- **actualQuantity**: 実際の持ち込み数（イベント当日の実数）
- **soldQuantity**: 売上数（販売実績）
- **remainingQuantity**: 残数（actualQuantity - soldQuantity）

### マイグレーション戦略（修正版）

#### Step 1: テーブル構造変更（複合主キー対応）
```sql
-- 1. 新しいカラムを追加
ALTER TABLE "ExhibitBook" ADD COLUMN "editionId" INTEGER;
ALTER TABLE "ExhibitBook" ADD COLUMN "actualQuantity" INTEGER;
ALTER TABLE "ExhibitBook" ADD COLUMN "soldQuantity" INTEGER;
ALTER TABLE "ExhibitBook" ADD COLUMN "remainingQuantity" INTEGER;

-- 2. editionIdに初版データを設定
UPDATE "ExhibitBook" eb
SET "editionId" = e.id
FROM "Edition" e
WHERE eb."bookId" = e."bookId" AND e."versionNumber" = 1;

-- 3. 外部キー制約を追加
ALTER TABLE "ExhibitBook" 
ADD CONSTRAINT "fk_exhibit_book_edition" 
FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE;

-- 4. 複合主キー制約を変更
ALTER TABLE "ExhibitBook" DROP CONSTRAINT IF EXISTS "ExhibitBook_pkey";
ALTER TABLE "ExhibitBook" ADD CONSTRAINT "ExhibitBook_pkey" 
PRIMARY KEY ("exhibitId", "editionId");

-- 5. NOT NULL制約を追加
ALTER TABLE "ExhibitBook" ALTER COLUMN "editionId" SET NOT NULL;

-- 6. 旧bookIdカラムを削除（最終段階）
-- ALTER TABLE "ExhibitBook" DROP COLUMN "bookId";
```

#### Step 2: 段階的移行手順（修正版）
1. **Step 1**: editionIdカラム追加、初版データ移行
2. **Step 2**: 複合主キー制約変更 (exhibitId, bookId) → (exhibitId, editionId)
3. **Step 3**: アプリケーションコードの版対応（サービス、DTO、コントローラー）
4. **Step 4**: ビューファイルの版対応
5. **Step 5**: 統合テストの更新・動作確認
6. **Step 6**: bookIdカラム削除（Phase 3-4で実施）

### 実装手順（詳細版）- **✅ 2025年6月29日実装完了**

#### Phase A: スキーマ変更・マイグレーション ✅完了
- [x] ExhibitBooksスキーマを版対応に変更（editionId追加、複合主キー変更）
- [x] データベースマイグレーション作成・実行（0016_wide_butterfly.sql）

#### Phase B: DTO・バリデーション更新 ✅完了
- [x] CreateExhibitBookDtoを版対応に更新（bookId → editionId）
- [x] UpdateExhibitBookDtoを版対応に更新（PartialTypeによる自動対応）

#### Phase C: サービス層更新 ✅完了
- [x] ExhibitBooksServiceを版対応に更新（JOIN処理の変更等）
- [x] findBook() → findEdition() への変更
- [x] 複合主キー (exhibitId, editionId) への対応
- [x] findAvailableBooks() → findAvailableEditions() への変更
- [x] addBookToExhibit() → addEditionToExhibit() への変更
- [x] removeBookFromExhibit() → removeEditionFromExhibit() への変更

#### Phase D: コントローラー・ビューファイル更新 ✅完了
- [x] ExhibitBooksControllerを版対応に更新（版選択フォーム等）
- [x] ビューファイルを版対応に更新（add.ejs, index.ejs, edit.ejs）

#### Phase E: 統合テスト・検証 ✅完了
- [x] 統合テストを版対応に更新（複合主キー対応等）
- [x] 型チェック・Linter実行・テスト実行で動作確認

### 作業見積もり（修正版）
- スキーマ変更・マイグレーション: 半日 ✅完了
- サービス・コントローラー更新: 1日 ✅完了
- ビューファイル更新: 半日 ✅完了
- 統合テスト更新: 1日 ✅完了
- **合計: 2-3日**（進捗: 100%完了）

### 🎯 Phase 3-1 実装完了詳細（2025年6月29日）

#### ✅ 完了した実装
1. **スキーマ変更・マイグレーション**
   - ExhibitBooksテーブルに版対応フィールド追加
     - `editionId`: editions.idへの外部キー（NOT NULL）
     - `actualQuantity`: 実際の持ち込み数（NULL許可）
     - `soldQuantity`: 売上数（NULL許可）
     - `remainingQuantity`: 残数（NULL許可、自動計算）
   - 複合主キーを(exhibitId, bookId)→(exhibitId, editionId)に変更
   - bookIdをNULL許可に変更（移行期間用）
   - マイグレーションファイル`0016_wide_butterfly.sql`生成・実行成功
   - **実装完了確認**: テスト用DBでもマイグレーション実行済み

2. **DTO更新完了**
   - `CreateExhibitBookDto`: bookId→editionId変更、新規数量フィールド追加
     - editionId必須バリデーション: 「版を選択してください」
     - 数量フィールド: plannedQuantity（必須）、actualQuantity・soldQuantity（オプション）
   - `UpdateExhibitBookDto`: PartialTypeによる自動対応完了
   - ValidationPipe統一パターン適用済み（@Transform設定統一）

3. **サービス層完全版対応**
   - `findEdition()`: 版検索機能（旧findBook()から変更）
   - `findExhibitBooks()`: 3テーブルJOIN処理（exhibitBooks→editions→books）
   - `findAvailableEditions()`: 現行版取得（既に追加済み版を除外）
   - `addEditionToExhibit()`: 版対応作成（複合主キー重複チェック付き）
   - `updateExhibitBook()`: 複合主キー(exhibitId,editionId)対応 + remainingQuantity自動計算
   - `removeEditionFromExhibit()`: 版対応削除（複合主キー対応）
   - **重要**: 全メソッドで版基準の処理に完全移行済み

4. **コントローラー版対応完了**
   - URLパラメータ: `:bookId` → `:editionId`に変更
   - `findAll()`: 版情報表示、数量管理項目追加、統計機能（総版数・総数量・売上金額）
   - `renderAddForm()`: 版選択フォーム対応（「書籍名 - 版名 (定価: ○○円)」形式）
   - `renderEditForm()`: 版情報表示、数量項目追加（自動計算機能付き）
   - 全CRUDメソッド: 複合主キー対応完了
   - **HTTPメソッドオーバーライド**: PUT/DELETE処理の版対応完了

#### ✅ 追加完了作業（2025年6月29日 後半）
1. **ビューファイル更新完了**
   - `add.ejs`: 版選択フォーム実装済み（ドロップダウンで「書籍名 - 版名 (定価: ○○円)」表示）
   - `index.ejs`: 版情報・数量統計表示実装済み（版数・総数量・売上金額の統計機能）
   - `edit.ejs`: 版情報・数量編集フォーム（remainingQuantity自動計算機能付き）実装済み
   - **レスポンシブ対応**: モバイル表示でも使いやすいUIデザイン実装済み

2. **統合テスト版対応完了**
   - 複合主キー対応のテストデータ作成済み（Exhibition+Edition組み合わせ）
   - bookId→editionIdの全テストコード修正済み（段階的テスト実装完了）
   - analyticsテストファイルも含めて全面的に版対応
   - ValidationExceptionFilterの版対応データ準備完了（editions配列・editionオブジェクト追加）
   - 型チェック・Linter実行完了（エラー0件確認済み）
   - **テスト実行確認**: 統合テスト・ユニットテスト全件パス確認済み

#### ✅ 最終調整・品質改善（2025年6月29日 終了時）
1. **価格表示フォーマット修正**
   - 編集フォーム表示で「1,000円」が正しく表示されない問題を修正
   - ExhibitBooksControllerのformattedBasePriceに「円」を追加
   - renderAddForm/renderEditFormメソッド2箇所を修正
   - 統合テスト失敗問題の完全解決

2. **テスト環境改善**
   - 統合テスト実行時の不要なinfoログ出力を抑制
   - test/setup.tsにLOG_LEVEL='error'設定を追加
   - クリーンなテスト出力の実現（テスト結果のみ表示）
   - 開発効率の向上

#### ✅ ドキュメント最終更新（2025年6月29日 終了時）
- Phase 3-1の全実装状況を phase3_legacy_migration.md に反映
- 最終調整（価格表示・テストログ）の詳細を追記
- 技術実装詳細の補完（複合主キー・JOIN処理・数量管理）
- 次フェーズ（Phase 3-2: データマイグレーション）準備のドキュメント整備完了

#### 🔧 技術的詳細（実装完了機能）
- **JOIN処理**: exhibitBooks→editions→booksの3テーブル結合実装済み
- **複合主キー**: (exhibitId, editionId)での一意性保証完了
- **数量管理**: planned/actual/sold/remainingの4種類数量管理完全実装
- **版選択UI**: 「書籍名 - 版名 (定価: ○○円)」形式実装済み
- **自動計算**: remainingQuantity = actualQuantity - soldQuantity 実装済み
- **エラーメッセージ**: 「頒布書籍」→「頒布版」に統一更新済み
- **ValidationExceptionFilter**: 版対応エラーハンドリング実装済み
- **統計表示**: 版数・数量統計・売上金額の表示実装済み
- **価格表示**: formattedBasePriceでの適切な通貨フォーマット（「1,000円」形式）
- **テスト環境**: 統合テスト実行時のクリーンな出力（ログ抑制）

#### 🎯 完成した新機能
1. **版ベース出展管理**: 書籍の特定版を出展対象として管理
2. **数量トラッキング**: イベント全体の数量管理機能
3. **売上分析**: 版別売上実績の集計・表示
4. **在庫連携**: 将来的な在庫管理との連携基盤
5. **レスポンシブUI**: モバイル対応の版選択・編集インターフェース

## 🗂️ Phase 3-2: データマイグレーション実装（1-2日）

### 既存データの移行手順

#### Step 1: 初版Editionレコードの生成
```sql
-- 既存の全Bookレコードに対して初版Editionを作成
INSERT INTO "Edition" (
  "bookId", 
  "versionName", 
  "versionNumber", 
  "pageCount", 
  "basePrice",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT 
  b.id,
  '初版',
  1,
  NULL, -- pageCountは既にEditionsテーブルに移行済み
  COALESCE(s.actualPrice, 0), -- 入稿データから実際の価格を取得
  true,
  b."createdAt",
  b."updatedAt"
FROM "Book" b
LEFT JOIN "Submission" s ON b.id = s."bookId"
WHERE NOT EXISTS (
  SELECT 1 FROM "Edition" e WHERE e."bookId" = b.id
);
```

#### Step 2: ExhibitBookの版対応
```sql
-- ExhibitBookのeditionIdを設定
UPDATE "ExhibitBook" eb
SET "editionId" = e.id
FROM "Edition" e
WHERE eb."bookId" = e."bookId" 
  AND e."versionNumber" = 1
  AND eb."editionId" IS NULL;
```

#### Step 3: データ整合性確認
```sql
-- 移行後の整合性チェッククエリ
-- 1. editionIdが設定されていないExhibitBookがないか確認
SELECT COUNT(*) as unmigrated_exhibit_books
FROM "ExhibitBook" 
WHERE "editionId" IS NULL;

-- 2. 初版が存在しないBookがないか確認
SELECT b.id, b.title
FROM "Book" b
LEFT JOIN "Edition" e ON b.id = e."bookId" AND e."versionNumber" = 1
WHERE e.id IS NULL;

-- 3. ExhibitBookとEditionの関連確認
SELECT 
  eb.id as exhibit_book_id,
  eb."bookId",
  eb."editionId",
  e."bookId" as edition_book_id,
  e."versionName"
FROM "ExhibitBook" eb
LEFT JOIN "Edition" e ON eb."editionId" = e.id
WHERE eb."bookId" != e."bookId";
```

### 移行前バックアップ戦略
```bash
# データベースの完全バックアップ
pg_dump -h localhost -p 15432 -U dojin_user -d dojin_management > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# 特定テーブルのバックアップ
pg_dump -h localhost -p 15432 -U dojin_user -d dojin_management -t Book -t ExhibitBook > backup_books_exhibitbooks_$(date +%Y%m%d_%H%M%S).sql
```

## 🗂️ Phase 3-3: 既存機能の版対応（1週間）

### 影響を受ける機能一覧

#### 1. 出展管理機能（ExhibitBooks）
- **表示機能**: 書籍名→版名の表示変更
- **作成機能**: 書籍選択→版選択への変更
- **編集機能**: 版情報の表示・編集
- **削除機能**: 版ベースでの削除処理

#### 2. イベント管理機能（Events）
- **出展書籍一覧**: 版情報を含む表示
- **売上実績**: 版ベースでの売上管理
- **在庫管理**: イベント前後の在庫移動

### 出展管理機能の版対応

#### ExhibitBooksService の修正
```typescript
// 修正前
async findAllByExhibitId(exhibitId: number) {
  return await this.drizzleService.db
    .select({
      id: exhibitBooks.id,
      bookTitle: books.title,
      plannedQuantity: exhibitBooks.plannedQuantity,
      actualPrice: exhibitBooks.actualPrice,
    })
    .from(exhibitBooks)
    .innerJoin(books, eq(exhibitBooks.bookId, books.id))
    .where(eq(exhibitBooks.exhibitId, exhibitId))
}

// 修正後（版対応）
async findAllByExhibitId(exhibitId: number) {
  return await this.drizzleService.db
    .select({
      id: exhibitBooks.id,
      bookTitle: books.title,
      editionName: editions.versionName,
      editionPrice: editions.basePrice,
      plannedQuantity: exhibitBooks.plannedQuantity,
      actualQuantity: exhibitBooks.actualQuantity,
      soldQuantity: exhibitBooks.soldQuantity,
      remainingQuantity: exhibitBooks.remainingQuantity,
      actualPrice: exhibitBooks.actualPrice,
    })
    .from(exhibitBooks)
    .innerJoin(editions, eq(exhibitBooks.editionId, editions.id))
    .innerJoin(books, eq(editions.bookId, books.id))
    .where(eq(exhibitBooks.exhibitId, exhibitId))
}
```

#### ExhibitBooksController の修正
```typescript
// 版選択フォームの実装
@Get('new')
@Render('exhibit-books/new')
async renderNewForm(@Param('exhibitId', ParseIntPipe) exhibitId: number) {
  const exhibit = await this.exhibitsService.findOne(exhibitId)
  
  // 版一覧を取得（現行版のみ表示）
  const availableEditions = await this.editionsService.findAllActive()
  
  return {
    title: '出展書籍追加',
    exhibit,
    availableEditions,
    formData: {},
  }
}

// 作成処理の版対応
@Post()
@UsePipes(ValidationPipe)
@Redirect('/exhibits/:exhibitId/books')
async create(
  @Param('exhibitId', ParseIntPipe) exhibitId: number,
  @Body() createExhibitBookDto: CreateExhibitBookDto,
) {
  await this.exhibitBooksService.create(exhibitId, createExhibitBookDto)
}
```

#### CreateExhibitBookDto の修正
```typescript
export class CreateExhibitBookDto {
  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '版を選択してください' })
  @IsInt({ message: '版IDは整数で入力してください' })
  editionId: number // bookId から変更

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsNotEmpty({ message: '予定数量は必須です' })
  @IsPositive({ message: '予定数量は正の数で入力してください' })
  plannedQuantity: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsPositive({ message: '実際数量は正の数で入力してください' })
  actualQuantity?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsInt({ message: '売上数量は整数で入力してください' })
  @Min(0, { message: '売上数量は0以上で入力してください' })
  soldQuantity?: number

  @Transform(({ value }) => value && value !== '' ? Number.parseInt(value, 10) : null)
  @IsOptional()
  @IsPositive({ message: '実際価格は正の数で入力してください' })
  actualPrice?: number

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString({ message: '備考は文字列で入力してください' })
  notes?: string
}
```

### ビューファイルの版対応

#### 出展書籍一覧表示
```html
<!-- 修正前 -->
<td><%= exhibitBook.bookTitle %></td>

<!-- 修正後（版対応） -->
<td>
  <div class="book-info">
    <strong><%= exhibitBook.bookTitle %></strong>
    <span class="edition-info">（<%= exhibitBook.editionName %>）</span>
  </div>
  <div class="price-info">
    定価: <%= exhibitBook.editionPrice.toLocaleString() %>円
    <% if (exhibitBook.actualPrice && exhibitBook.actualPrice !== exhibitBook.editionPrice) { %>
      → 販売価格: <%= exhibitBook.actualPrice.toLocaleString() %>円
    <% } %>
  </div>
</td>
```

#### 版選択フォーム
```html
<div class="form-group">
  <label for="editionId">版選択 *</label>
  <select name="editionId" id="editionId" required>
    <option value="">版を選択してください</option>
    <% availableEditions.forEach(edition => { %>
      <option value="<%= edition.id %>" <%= formData.editionId == edition.id ? 'selected' : '' %>>
        <%= edition.bookTitle %> - <%= edition.versionName %>
        （定価: <%= edition.basePrice.toLocaleString() %>円）
      </option>
    <% }) %>
  </select>
</div>
```

## 🗂️ Phase 3-4: 統合テスト・検証（2-3日）

### 統合テスト実装

#### ExhibitBooks版対応テスト
```typescript
describe('ExhibitBooks - Edition Integration', () => {
  let testBook: Book
  let testEdition: Edition
  let testExhibit: Exhibit

  beforeEach(async () => {
    await testDbUtils.cleanupDatabase()
    
    // テストデータ作成
    testBook = await createTestBook()
    testEdition = await createTestEdition(testBook.id)
    testExhibit = await createTestExhibit()
  })

  it('should create exhibit book with edition', async () => {
    const response = await request(app.getHttpServer())
      .post(`/exhibits/${testExhibit.id}/books`)
      .send({
        editionId: testEdition.id,
        plannedQuantity: 50,
        actualPrice: 1000,
      })
      .expect(302)

    // リダイレクト先確認
    expect(response.headers.location).toBe(`/exhibits/${testExhibit.id}/books`)
  })

  it('should display edition info in exhibit books list', async () => {
    // 出展書籍作成
    await createTestExhibitBook({
      exhibitId: testExhibit.id,
      editionId: testEdition.id,
      plannedQuantity: 50,
    })

    const response = await request(app.getHttpServer())
      .get(`/exhibits/${testExhibit.id}/books`)
      .expect(200)

    expect(response.text).toContain(testBook.title)
    expect(response.text).toContain(testEdition.versionName)
    expect(response.text).toContain('50冊')
  })

  it('should update exhibit book quantities', async () => {
    const exhibitBook = await createTestExhibitBook({
      exhibitId: testExhibit.id,
      editionId: testEdition.id,
      plannedQuantity: 50,
    })

    const response = await request(app.getHttpServer())
      .put(`/exhibit-books/${exhibitBook.id}`)
      .send({
        plannedQuantity: 50,
        actualQuantity: 45,
        soldQuantity: 30,
        actualPrice: 1000,
      })
      .expect(302)

    // データベース確認
    const updatedExhibitBook = await exhibitBooksService.findOne(exhibitBook.id)
    expect(updatedExhibitBook.actualQuantity).toBe(45)
    expect(updatedExhibitBook.soldQuantity).toBe(30)
    expect(updatedExhibitBook.remainingQuantity).toBe(15) // 45 - 30
  })
})
```

### データ整合性検証

#### 移行後検証クエリ
```sql
-- 1. 全ExhibitBookにeditionIdが設定されているか
SELECT 
  COUNT(*) as total_exhibit_books,
  COUNT("editionId") as migrated_exhibit_books,
  (COUNT(*) - COUNT("editionId")) as unmigrated_count
FROM "ExhibitBook";

-- 2. editionIdとbookIdの関連性確認
SELECT 
  eb.id,
  eb."editionId",
  e."bookId" as edition_book_id,
  eb."bookId" as old_book_id,
  CASE 
    WHEN e."bookId" = eb."bookId" THEN 'OK'
    ELSE 'ERROR'
  END as consistency_check
FROM "ExhibitBook" eb
LEFT JOIN "Edition" e ON eb."editionId" = e.id
WHERE eb."bookId" IS NOT NULL; -- 移行期間中のチェック

-- 3. 数量の整合性確認
SELECT 
  id,
  "actualQuantity",
  "soldQuantity",
  "remainingQuantity",
  ("actualQuantity" - "soldQuantity") as calculated_remaining,
  CASE 
    WHEN "remainingQuantity" = ("actualQuantity" - "soldQuantity") THEN 'OK'
    WHEN "remainingQuantity" IS NULL AND "actualQuantity" IS NULL THEN 'OK'
    ELSE 'ERROR'
  END as quantity_check
FROM "ExhibitBook"
WHERE "actualQuantity" IS NOT NULL AND "soldQuantity" IS NOT NULL;
```

### 性能テスト

#### レスポンス時間測定
```typescript
describe('Performance Tests - Edition Integration', () => {
  it('should load exhibit books list within acceptable time', async () => {
    // 大量のテストデータ作成
    const testData = await createLargeTestDataset()
    
    const startTime = Date.now()
    const response = await request(app.getHttpServer())
      .get(`/exhibits/${testData.exhibitId}/books`)
      .expect(200)
    const endTime = Date.now()
    
    const responseTime = endTime - startTime
    expect(responseTime).toBeLessThan(2000) // 2秒以内
  })
})
```

## 📊 Phase 3 完了条件

### 技術的検証
- **全統合テスト通過**: ExhibitBooks版対応テスト完全成功
- **データ整合性確認**: 移行前後でのデータ一貫性確保
- **性能要件**: レスポンス時間の許容範囲内維持
- **型チェック**: TypeScriptエラー0件

### 機能検証
- **版選択機能**: 出展書籍作成時の版選択正常動作
- **版情報表示**: 一覧・詳細画面での版情報適切表示
- **数量管理**: 実際数量・売上数量・残数の整合性
- **既存データ**: 移行済み既存データの正常動作

### 運用検証
- **バックアップ・リストア**: 緊急時のデータ復旧手順確認
- **ロールバック手順**: 問題発生時の段階的ロールバック
- **監視体制**: 移行後のシステム監視・アラート設定

## 🔒 リスク管理と対策

### 想定リスク
1. **データ移行失敗**: 既存データの破損・消失
2. **性能劣化**: JOIN処理増加によるレスポンス悪化
3. **機能停止**: 移行期間中のサービス停止
4. **整合性不備**: 移行後のデータ不整合

### 対策
1. **完全バックアップ**: 移行前の全データバックアップ
2. **段階的移行**: 機能単位での段階的移行実施
3. **ロールバック計画**: 各段階でのロールバック手順整備
4. **検証強化**: 移行後の徹底的なデータ検証

---

**実装予定時期**: Phase 2完了後  
**最終更新**: 2025年6月29日（Phase 3-1完全完了・ドキュメント最終反映済み）  
**Phase 3-1実装状況**: ✅ **完全完了**（全機能実装済み・品質改善・ドキュメント完了）  
**実装済み内容**: スキーマ変更・DTO・サービス・コントローラー・ビューファイル・統合テスト・ValidationExceptionFilter対応・価格表示修正・テスト環境改善  
**技術実装詳細**: 複合主キー・3テーブルJOIN・数量自動計算・版選択UI・レスポンシブデザイン・通貨フォーマット・ログ抑制  
**テスト状況**: 統合テスト・ユニットテスト全件パス、型チェック・Linter実行完了、テスト出力クリーン化完了  
**ドキュメント状況**: 実装詳細・教訓・技術仕様の完全記録済み  
**次回更新予定**: Phase 3-2（データマイグレーション実装）開始時