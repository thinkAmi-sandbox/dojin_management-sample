CREATE TABLE "Author" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"bio" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "Author_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "BookAuthor" (
	"bookId" integer NOT NULL,
	"authorId" integer NOT NULL,
	CONSTRAINT "BookAuthor_bookId_authorId_pk" PRIMARY KEY("bookId","authorId")
);
--> statement-breakpoint
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_Author_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."Author"("id") ON DELETE cascade ON UPDATE no action;