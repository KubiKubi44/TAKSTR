CREATE TYPE "public"."demand_status" AS ENUM('new', 'seen', 'contacted', 'dismissed');--> statement-breakpoint
CREATE TABLE "demand_lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"excerpt" text,
	"category" text,
	"posted_at" timestamp with time zone,
	"status" "demand_status" DEFAULT 'new' NOT NULL,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demand_source_external_uq" UNIQUE("source","external_id")
);
--> statement-breakpoint
ALTER TABLE "demand_lead" ADD CONSTRAINT "demand_lead_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;