-- Phase 3-2: 初版Editionレコードの生成
-- 既存の全Bookレコードに対して初版Editionを作成
-- 実行前に必ずバックアップを取得してください

-- 1. 既存データの確認
SELECT COUNT(*) as total_books FROM "Book";
SELECT COUNT(*) as existing_editions FROM "Edition";

-- 2. 初版Editionレコードの作成
-- 注意: このクエリは既にEditionが存在するBookには新しいEditionを作成しません
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
  COALESCE(
    -- 最新の入稿データから価格を算出（totalCostを数量で割る）
    (SELECT 
       CASE 
         WHEN s."totalCost" IS NOT NULL AND s.quantity > 0 
         THEN (s."totalCost" / s.quantity)
         ELSE 0
       END
     FROM "Submission" s 
     WHERE s."bookId" = b.id 
     ORDER BY s."createdAt" DESC 
     LIMIT 1), 
    500  -- デフォルト価格500円
  ),
  true,
  b."createdAt",
  b."updatedAt"
FROM "Book" b
WHERE NOT EXISTS (
  SELECT 1 FROM "Edition" e WHERE e."bookId" = b.id
);

-- 3. 作成結果の確認
SELECT 
  b.id as book_id,
  b.title,
  e.id as edition_id,
  e."versionName",
  e."versionNumber",
  e."basePrice",
  e."isActive"
FROM "Book" b
LEFT JOIN "Edition" e ON b.id = e."bookId" AND e."versionNumber" = 1
ORDER BY b.id;

-- 4. 統計情報の表示
WITH stats AS (
  SELECT 
    COUNT(DISTINCT b.id) as total_books,
    COUNT(DISTINCT e.id) as total_editions,
    COUNT(DISTINCT CASE WHEN e."versionNumber" = 1 THEN e.id END) as initial_editions
  FROM "Book" b
  LEFT JOIN "Edition" e ON b.id = e."bookId"
)
SELECT 
  total_books,
  total_editions,
  initial_editions,
  (total_books - initial_editions) as books_without_initial_edition
FROM stats;