-- Phase 3-2: データ整合性確認クエリ
-- 移行後のデータ整合性を徹底的に検証

-- ======================================
-- 1. Edition関連の整合性チェック
-- ======================================

-- 1.1 初版が存在しないBookがないか確認
SELECT 
  'Books without initial edition' as check_type,
  COUNT(*) as error_count,
  string_agg(b.title, ', ') as affected_records
FROM "Book" b
LEFT JOIN "Edition" e ON b.id = e."bookId" AND e."versionNumber" = 1
WHERE e.id IS NULL;

-- 1.2 重複する初版がないか確認
WITH duplicate_initial_editions AS (
  SELECT 
    "bookId",
    COUNT(*) as edition_count
  FROM "Edition"
  WHERE "versionNumber" = 1
  GROUP BY "bookId"
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicate initial editions' as check_type,
  COUNT(*) as error_count,
  string_agg(b.title, ', ') as affected_records
FROM duplicate_initial_editions die
INNER JOIN "Book" b ON die."bookId" = b.id;

-- ======================================
-- 2. ExhibitBook関連の整合性チェック
-- ======================================

-- 2.1 editionIdが設定されていないExhibitBookがないか確認
SELECT 
  'ExhibitBooks without editionId' as check_type,
  COUNT(*) as error_count,
  string_agg(CAST(eb."exhibitId" || '-' || eb."bookId" AS TEXT), ', ') as affected_records
FROM "ExhibitBook" eb
WHERE eb."editionId" IS NULL;

-- 2.2 ExhibitBookとEditionの関連確認（bookIdの整合性）
WITH inconsistent_exhibit_books AS (
  SELECT 
    eb."exhibitId",
    eb."bookId",
    eb."editionId",
    e."bookId" as edition_book_id
  FROM "ExhibitBook" eb
  LEFT JOIN "Edition" e ON eb."editionId" = e.id
  WHERE eb."bookId" IS NOT NULL 
    AND eb."editionId" IS NOT NULL
    AND eb."bookId" != e."bookId"
)
SELECT 
  'Inconsistent bookId in ExhibitBook' as check_type,
  COUNT(*) as error_count,
  string_agg(CAST(ieb."exhibitId" || '-' || ieb."editionId" AS TEXT), ', ') as affected_records
FROM inconsistent_exhibit_books ieb;

-- 2.3 数量の整合性確認
WITH quantity_issues AS (
  SELECT 
    "exhibitId",
    "editionId",
    "actualQuantity",
    "soldQuantity",
    "remainingQuantity",
    ("actualQuantity" - "soldQuantity") as calculated_remaining
  FROM "ExhibitBook"
  WHERE "actualQuantity" IS NOT NULL 
    AND "soldQuantity" IS NOT NULL
    AND "remainingQuantity" IS NOT NULL
    AND "remainingQuantity" != ("actualQuantity" - "soldQuantity")
)
SELECT 
  'Quantity calculation errors' as check_type,
  COUNT(*) as error_count,
  string_agg(CAST(qi."exhibitId" || '-' || qi."editionId" AS TEXT), ', ') as affected_records
FROM quantity_issues qi;

-- ======================================
-- 3. 統計サマリー
-- ======================================

-- 3.1 全体統計
WITH summary AS (
  SELECT 
    (SELECT COUNT(*) FROM "Book") as total_books,
    (SELECT COUNT(*) FROM "Edition") as total_editions,
    (SELECT COUNT(*) FROM "Edition" WHERE "versionNumber" = 1) as initial_editions,
    (SELECT COUNT(*) FROM "ExhibitBook") as total_exhibit_books,
    (SELECT COUNT(*) FROM "ExhibitBook" WHERE "editionId" IS NOT NULL) as migrated_exhibit_books,
    (SELECT COUNT(*) FROM "ExhibitBook" WHERE "bookId" IS NULL) as fully_migrated_exhibit_books
)
SELECT 
  'Total books' as metric,
  total_books as count
FROM summary
UNION ALL
SELECT 
  'Total editions' as metric,
  total_editions as count
FROM summary
UNION ALL
SELECT 
  'Initial editions' as metric,
  initial_editions as count
FROM summary
UNION ALL
SELECT 
  'Books with initial edition' as metric,
  CASE 
    WHEN total_books = initial_editions THEN total_books
    ELSE initial_editions
  END as count
FROM summary
UNION ALL
SELECT 
  'Total exhibit books' as metric,
  total_exhibit_books as count
FROM summary
UNION ALL
SELECT 
  'Migrated exhibit books' as metric,
  migrated_exhibit_books as count
FROM summary
UNION ALL
SELECT 
  'Fully migrated exhibit books (bookId removed)' as metric,
  fully_migrated_exhibit_books as count
FROM summary;

-- ======================================
-- 4. 詳細な移行状況レポート
-- ======================================

-- 4.1 ExhibitBookの移行状態別集計
SELECT 
  CASE 
    WHEN "editionId" IS NULL AND "bookId" IS NOT NULL THEN 'Not migrated'
    WHEN "editionId" IS NOT NULL AND "bookId" IS NOT NULL THEN 'Migrated (bookId retained)'
    WHEN "editionId" IS NOT NULL AND "bookId" IS NULL THEN 'Fully migrated'
    ELSE 'Unknown state'
  END as migration_state,
  COUNT(*) as count
FROM "ExhibitBook"
GROUP BY 
  CASE 
    WHEN "editionId" IS NULL AND "bookId" IS NOT NULL THEN 'Not migrated'
    WHEN "editionId" IS NOT NULL AND "bookId" IS NOT NULL THEN 'Migrated (bookId retained)'
    WHEN "editionId" IS NOT NULL AND "bookId" IS NULL THEN 'Fully migrated'
    ELSE 'Unknown state'
  END
ORDER BY count DESC;

-- 4.2 イベント別の移行状況
SELECT 
  ev.name as event_name,
  ev."eventDate",
  COUNT(DISTINCT eb."exhibitId") as total_exhibits,
  COUNT(eb."editionId") as migrated_exhibit_books,
  COUNT(CASE WHEN eb."editionId" IS NULL THEN 1 END) as unmigrated_exhibit_books
FROM "ExhibitBook" eb
INNER JOIN "Exhibit" ex ON eb."exhibitId" = ex.id
INNER JOIN "Event" ev ON ex."eventId" = ev.id
GROUP BY ev.id, ev.name, ev."eventDate"
ORDER BY ev."eventDate" DESC;