CREATE TABLE "Deadline" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"dueDate" timestamp (3) NOT NULL,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE cascade ON UPDATE no action;