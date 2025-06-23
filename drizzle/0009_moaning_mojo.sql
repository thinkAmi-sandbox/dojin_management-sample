CREATE TABLE "ExhibitBook" (
	"exhibitId" integer NOT NULL,
	"bookId" integer NOT NULL,
	"plannedQuantity" integer DEFAULT 0 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ExhibitBook_exhibitId_bookId_pk" PRIMARY KEY("exhibitId","bookId")
);
--> statement-breakpoint
ALTER TABLE "ExhibitBook" ADD CONSTRAINT "ExhibitBook_exhibitId_Exhibit_id_fk" FOREIGN KEY ("exhibitId") REFERENCES "public"."Exhibit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ExhibitBook" ADD CONSTRAINT "ExhibitBook_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE cascade ON UPDATE no action;