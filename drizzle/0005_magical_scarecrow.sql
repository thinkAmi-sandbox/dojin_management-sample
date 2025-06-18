CREATE TABLE "Submission" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookId" integer NOT NULL,
	"printingCompanyId" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"submissionDate" timestamp (3),
	"expectedDeliveryDate" timestamp (3),
	"actualDeliveryDate" timestamp (3),
	"quantity" integer NOT NULL,
	"specificationNotes" text,
	"printingCost" integer,
	"shippingCost" integer,
	"otherCost" integer,
	"totalCost" integer,
	"discountType" varchar(50),
	"deliveryDestination" varchar(255),
	"deliveryNotes" text,
	"submissionFileNotes" text,
	"generalNotes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bookId_Book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_printingCompanyId_PrintingCompany_id_fk" FOREIGN KEY ("printingCompanyId") REFERENCES "public"."PrintingCompany"("id") ON DELETE restrict ON UPDATE no action;