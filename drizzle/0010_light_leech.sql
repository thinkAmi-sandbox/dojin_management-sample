CREATE TYPE "public"."circle_role" AS ENUM('representative', 'member', 'guest');--> statement-breakpoint
CREATE TABLE "CircleAuthor" (
	"circleId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"role" "circle_role" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL,
	"leftAt" timestamp (3),
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "CircleAuthor_circleId_authorId_pk" PRIMARY KEY("circleId","authorId")
);
--> statement-breakpoint
ALTER TABLE "CircleAuthor" ADD CONSTRAINT "CircleAuthor_circleId_Circle_id_fk" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CircleAuthor" ADD CONSTRAINT "CircleAuthor_authorId_Author_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."Author"("id") ON DELETE cascade ON UPDATE no action;