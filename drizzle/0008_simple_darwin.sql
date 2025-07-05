CREATE TYPE "public"."exhibit_status" AS ENUM('applied', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "Exhibit" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"circleId" integer NOT NULL,
	"status" "exhibit_status" DEFAULT 'applied' NOT NULL,
	"applicationDate" timestamp (3) DEFAULT now() NOT NULL,
	"resultDate" timestamp (3),
	"spaceNumber" varchar(50),
	"spaceType" varchar(50),
	"applicationNotes" text,
	"resultNotes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_eventId_Event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_circleId_Circle_id_fk" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE cascade ON UPDATE no action;