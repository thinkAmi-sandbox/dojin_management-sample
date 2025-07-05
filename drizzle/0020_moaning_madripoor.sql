CREATE TABLE "Consignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"locationId" integer NOT NULL,
	"storeName" varchar(255) NOT NULL,
	"commissionRate" integer NOT NULL,
	"settlementCycle" varchar(50),
	"contractStartDate" date NOT NULL,
	"contractEndDate" date,
	"contactPerson" varchar(255),
	"contactEmail" varchar(255),
	"contactPhone" varchar(50),
	"paymentInfo" text,
	"contractTerms" text,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_locationId_StorageLocation_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."StorageLocation"("id") ON DELETE no action ON UPDATE no action;