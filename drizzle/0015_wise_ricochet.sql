CREATE TYPE "public"."stock_movement_type" AS ENUM('inbound', 'outbound', 'transfer', 'sale', 'return', 'adjustment', 'disposal');--> statement-breakpoint
CREATE TABLE "StockMovement" (
	"id" serial PRIMARY KEY NOT NULL,
	"editionId" integer NOT NULL,
	"fromLocationId" integer,
	"toLocationId" integer,
	"quantity" integer NOT NULL,
	"movementType" "stock_movement_type" NOT NULL,
	"referenceType" varchar(50),
	"referenceId" integer,
	"reason" text,
	"movedAt" timestamp (3) DEFAULT now() NOT NULL,
	"createdBy" varchar(255),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromLocationId_StorageLocation_id_fk" FOREIGN KEY ("fromLocationId") REFERENCES "public"."StorageLocation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toLocationId_StorageLocation_id_fk" FOREIGN KEY ("toLocationId") REFERENCES "public"."StorageLocation"("id") ON DELETE no action ON UPDATE no action;