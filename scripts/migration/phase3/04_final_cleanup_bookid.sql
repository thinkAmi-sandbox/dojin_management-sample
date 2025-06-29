-- Phase 3-4: bookIdカラム最終削除スクリプト
-- ExhibitBookテーブルからbookIdカラムを完全削除

-- ======================================
-- 1. 事前確認: 移行状況の最終チェック
-- ======================================

-- 1.1 移行状況確認
SELECT 
  'Pre-cleanup check' as check_type,
  COUNT(*) as total_exhibit_books,
  COUNT("editionId") as migrated_exhibit_books,
  COUNT("bookId") as remaining_book_ids,
  (COUNT(*) - COUNT("editionId")) as unmigrated_count
FROM "ExhibitBook";

-- 1.2 editionIdが設定されていないレコードがないか確認
SELECT 
  'Unmigrated records check' as check_type,
  COUNT(*) as unmigrated_count,
  string_agg(CAST("exhibitId" AS TEXT), ', ') as affected_exhibit_ids
FROM "ExhibitBook" 
WHERE "editionId" IS NULL;

-- ======================================
-- 2. bookIdカラム削除実行
-- ======================================

-- 移行が完全に完了していることを確認してからbookIdカラムを削除
DO $$ 
BEGIN
  -- 未移行レコードがないことを確認
  IF (SELECT COUNT(*) FROM "ExhibitBook" WHERE "editionId" IS NULL) = 0 THEN
    -- bookIdカラムを削除
    ALTER TABLE "ExhibitBook" DROP COLUMN IF EXISTS "bookId";
    RAISE NOTICE 'bookId column has been successfully dropped from ExhibitBook table.';
  ELSE
    RAISE EXCEPTION 'Cannot drop bookId column: unmigrated records exist. Please complete migration first.';
  END IF;
END $$;

-- ======================================
-- 3. 削除後の確認
-- ======================================

-- 3.1 テーブル構造確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ExhibitBook' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3.2 最終統計
SELECT 
  'Final statistics' as status,
  COUNT(*) as total_exhibit_books,
  COUNT("editionId") as edition_based_records,
  COUNT(DISTINCT eb."exhibitId") as total_exhibits,
  COUNT(DISTINCT e.id) as total_editions
FROM "ExhibitBook" eb
INNER JOIN "Edition" e ON eb."editionId" = e.id;

-- 3.3 データ整合性最終確認
SELECT 
  'Final integrity check' as check_type,
  'All ExhibitBooks have valid editionId' as result
FROM "ExhibitBook" eb
INNER JOIN "Edition" e ON eb."editionId" = e.id
WHERE NOT EXISTS (
  SELECT 1 FROM "ExhibitBook" WHERE "editionId" IS NULL
);

COMMIT;