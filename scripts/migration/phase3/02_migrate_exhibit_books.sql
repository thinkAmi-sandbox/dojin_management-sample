-- Phase 3-2: ExhibitBookの版対応マイグレーション
-- ExhibitBookのeditionIdを設定し、既存データを版ベースに移行
-- 実行前に必ずバックアップを取得してください

-- 1. 移行前の状態確認
SELECT 
  COUNT(*) as total_exhibit_books,
  COUNT("editionId") as already_migrated,
  COUNT(CASE WHEN "editionId" IS NULL THEN 1 END) as to_be_migrated
FROM "ExhibitBook";

-- 2. ExhibitBookに対応する初版を確認
SELECT 
  eb."exhibitId",
  eb."bookId",
  eb."editionId",
  b.title as book_title,
  e.id as target_edition_id,
  e."versionName",
  e."basePrice"
FROM "ExhibitBook" eb
INNER JOIN "Book" b ON eb."bookId" = b.id
LEFT JOIN "Edition" e ON b.id = e."bookId" AND e."versionNumber" = 1
WHERE eb."editionId" IS NULL;

-- 3. ExhibitBookのeditionIdを設定
UPDATE "ExhibitBook" eb
SET 
  "editionId" = e.id,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Edition" e
WHERE eb."bookId" = e."bookId" 
  AND e."versionNumber" = 1
  AND eb."editionId" IS NULL;

-- 4. 移行後の確認
SELECT 
  COUNT(*) as total_exhibit_books,
  COUNT("editionId") as migrated_exhibit_books,
  COUNT(CASE WHEN "editionId" IS NULL THEN 1 END) as unmigrated_exhibit_books
FROM "ExhibitBook";

-- 5. 移行されたデータの詳細確認
SELECT 
  eb."exhibitId",
  ev.name as event_name,
  b.title as book_title,
  e."versionName",
  e."basePrice",
  eb."plannedQuantity",
  eb."actualQuantity",
  eb."soldQuantity",
  eb."remainingQuantity",
  eb."price" as exhibit_price
FROM "ExhibitBook" eb
INNER JOIN "Exhibit" ex ON eb."exhibitId" = ex.id
INNER JOIN "Event" ev ON ex."eventId" = ev.id
INNER JOIN "Edition" e ON eb."editionId" = e.id
INNER JOIN "Book" b ON e."bookId" = b.id
ORDER BY ev."eventDate" DESC, b.title;