-- Step 1: 旧主キー制約を削除
ALTER TABLE "ExhibitBook" DROP CONSTRAINT "ExhibitBook_exhibitId_bookId_pk";--> statement-breakpoint

-- Step 2: bookIdをNULL許可に変更
ALTER TABLE "ExhibitBook" ALTER COLUMN "bookId" DROP NOT NULL;--> statement-breakpoint

-- Step 3: 新しいカラムを追加（editionIdはNULL許可で最初に追加）
ALTER TABLE "ExhibitBook" ADD COLUMN "editionId" integer;--> statement-breakpoint
ALTER TABLE "ExhibitBook" ADD COLUMN "actualQuantity" integer;--> statement-breakpoint
ALTER TABLE "ExhibitBook" ADD COLUMN "soldQuantity" integer;--> statement-breakpoint
ALTER TABLE "ExhibitBook" ADD COLUMN "remainingQuantity" integer;--> statement-breakpoint

-- Step 4: 外部キー制約を追加
ALTER TABLE "ExhibitBook" ADD CONSTRAINT "ExhibitBook_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 5: editionIdにNOT NULL制約を追加（データ移行後に実行予定）
-- ALTER TABLE "ExhibitBook" ALTER COLUMN "editionId" SET NOT NULL;--> statement-breakpoint

-- Step 6: 新しい複合主キー制約を追加（データ移行後に実行予定）  
-- ALTER TABLE "ExhibitBook" ADD CONSTRAINT "ExhibitBook_exhibitId_editionId_pk" PRIMARY KEY("exhibitId","editionId");--> statement-breakpoint