CREATE TYPE "public"."consignment_sales_status" AS ENUM('reported', 'confirmed', 'adjusted', 'settled');--> statement-breakpoint
CREATE TABLE "ConsignmentSales" (
	"id" serial PRIMARY KEY NOT NULL,
	"consignmentId" integer NOT NULL,
	"reportPeriodStart" date NOT NULL,
	"reportPeriodEnd" date NOT NULL,
	"totalSalesAmount" integer NOT NULL,
	"commissionAmount" integer NOT NULL,
	"netAmount" integer NOT NULL,
	"status" "consignment_sales_status" DEFAULT 'reported' NOT NULL,
	"reportedAt" timestamp (3) DEFAULT now() NOT NULL,
	"confirmedAt" timestamp (3),
	"adjustedAt" timestamp (3),
	"settledAt" timestamp (3),
	"settlementMethod" varchar(50),
	"adjustmentReason" text,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ConsignmentSalesDetail" (
	"id" serial PRIMARY KEY NOT NULL,
	"consignmentSalesId" integer NOT NULL,
	"editionId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ConsignmentSales" ADD CONSTRAINT "ConsignmentSales_consignmentId_Consignment_id_fk" FOREIGN KEY ("consignmentId") REFERENCES "public"."Consignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ConsignmentSalesDetail" ADD CONSTRAINT "ConsignmentSalesDetail_consignmentSalesId_ConsignmentSales_id_fk" FOREIGN KEY ("consignmentSalesId") REFERENCES "public"."ConsignmentSales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ConsignmentSalesDetail" ADD CONSTRAINT "ConsignmentSalesDetail_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE no action ON UPDATE no action;