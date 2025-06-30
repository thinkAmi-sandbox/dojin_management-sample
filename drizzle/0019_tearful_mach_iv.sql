CREATE TYPE "public"."pricing_rule_type" AS ENUM('event_discount', 'bulk_discount', 'early_bird', 'consignment');--> statement-breakpoint
CREATE TABLE "PricingRule" (
	"id" serial PRIMARY KEY NOT NULL,
	"editionId" integer NOT NULL,
	"ruleType" "pricing_rule_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" integer,
	"discountRate" integer,
	"minQuantity" integer,
	"eventId" integer,
	"validFrom" date,
	"validUntil" date,
	"priority" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_editionId_Edition_id_fk" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_eventId_Event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE no action ON UPDATE no action;