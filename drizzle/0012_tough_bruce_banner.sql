ALTER TABLE "Book" ADD COLUMN "genre" varchar(100);--> statement-breakpoint
ALTER TABLE "Book" ADD COLUMN "seriesName" varchar(255);--> statement-breakpoint
ALTER TABLE "Book" ADD COLUMN "seriesNumber" integer;--> statement-breakpoint
ALTER TABLE "Book" DROP COLUMN "pageCount";