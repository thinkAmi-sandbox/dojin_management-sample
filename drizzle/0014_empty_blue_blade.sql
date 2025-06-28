CREATE TABLE "Stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"editionId" integer NOT NULL,
	"locationId" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reservedQuantity" integer DEFAULT 0 NOT NULL,
	"availableQuantity" integer DEFAULT 0 NOT NULL,
	"lastCheckedAt" timestamp (3),
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_locationId_StorageLocation_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."StorageLocation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- 数量制約追加
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_positive" 
CHECK ("quantity" >= 0 AND "reservedQuantity" >= 0 AND "availableQuantity" >= 0);--> statement-breakpoint
ALTER TABLE "Stock" ADD CONSTRAINT "chk_quantity_balance" 
CHECK ("quantity" = "reservedQuantity" + "availableQuantity");--> statement-breakpoint
-- ユニーク制約（同じ版・場所の組み合わせは1レコードまで）
ALTER TABLE "Stock" ADD CONSTRAINT "unq_stock_edition_location" 
UNIQUE ("editionId", "locationId");--> statement-breakpoint
-- パフォーマンス最適化インデックス
CREATE INDEX "idx_stocks_edition_location" ON "Stock" ("editionId", "locationId");--> statement-breakpoint
CREATE INDEX "idx_stocks_edition" ON "Stock" ("editionId");--> statement-breakpoint
CREATE INDEX "idx_stocks_location" ON "Stock" ("locationId");--> statement-breakpoint
CREATE INDEX "idx_stocks_last_checked" ON "Stock" ("lastCheckedAt");