CREATE TABLE "Event" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"eventDate" date NOT NULL,
	"venue" varchar(255) NOT NULL,
	"applicationStartDate" date NOT NULL,
	"applicationEndDate" date NOT NULL,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
