CREATE TYPE "public"."sales_transaction_type" AS ENUM('event', 'consignment', 'online', 'direct');--> statement-breakpoint
CREATE TABLE "SalesDetail" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionId" integer NOT NULL,
	"editionId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" integer NOT NULL,
	"discountAmount" integer DEFAULT 0,
	"subtotal" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SalesTransaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionType" "sales_transaction_type" NOT NULL,
	"eventId" integer,
	"exhibitId" integer,
	"locationId" integer,
	"customerName" varchar(255),
	"customerEmail" varchar(255),
	"totalAmount" integer NOT NULL,
	"discountAmount" integer DEFAULT 0,
	"finalAmount" integer NOT NULL,
	"paymentMethod" varchar(50),
	"transactionDate" timestamp (3) DEFAULT now() NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SalesDetail" ADD CONSTRAINT "SalesDetail_transactionId_SalesTransaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."SalesTransaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SalesDetail" ADD CONSTRAINT "SalesDetail_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_eventId_Event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_exhibitId_Exhibit_id_fk" FOREIGN KEY ("exhibitId") REFERENCES "public"."Exhibit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_locationId_StorageLocation_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."StorageLocation"("id") ON DELETE no action ON UPDATE no action;