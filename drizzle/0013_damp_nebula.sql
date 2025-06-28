CREATE TYPE "public"."storage_location_type" AS ENUM('home', 'warehouse', 'consignment', 'event');--> statement-breakpoint
CREATE TABLE "StorageLocation" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "storage_location_type" NOT NULL,
	"isConsignment" boolean DEFAULT false NOT NULL,
	"address" text,
	"contactInfo" text,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
