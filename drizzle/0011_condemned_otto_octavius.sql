CREATE TABLE "Edition" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookId" integer NOT NULL,
	"versionName" varchar(100) NOT NULL,
	"versionNumber" integer DEFAULT 1 NOT NULL,
	"isbn" varchar(13),
	"pageCount" integer,
	"basePrice" integer NOT NULL,
	"printingCost" integer,
	"publishDate" date,
	"editionNotes" text,
	"coverImageUrl" varchar(500),
	"isActive" boolean DEFAULT true NOT NULL,
	"isSoldOut" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "Edition_isbn_unique" UNIQUE("isbn")
);
--> statement-breakpoint
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE cascade ON UPDATE no action;