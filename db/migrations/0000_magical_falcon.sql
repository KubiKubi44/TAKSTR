CREATE TYPE "public"."activity_actor" AS ENUM('app', 'telegram', 'system');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('status_change', 'note', 'email_sent', 'reply', 'call');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('active', 'paused', 'done');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('draft', 'approved', 'sent', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('places_api', 'manual', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('discovered', 'scored', 'analyzed', 'drafted', 'sent', 'replied', 'meeting', 'won', 'dead');--> statement-breakpoint
CREATE TYPE "public"."outreach_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor" "activity_actor" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"vertical" text NOT NULL,
	"region" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "campaign_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"recipient_email" text,
	"model" text NOT NULL,
	"edit_instruction" text,
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"website_url" text NOT NULL,
	"contact_email" text,
	"phone" text,
	"source" "lead_source" NOT NULL,
	"score" integer,
	"status" "lead_status" DEFAULT 'discovered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_campaign_website_uq" UNIQUE("campaign_id","website_url")
);
--> statement-breakpoint
CREATE TABLE "outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"draft_id" uuid,
	"direction" "outreach_direction" NOT NULL,
	"to_addr" text NOT NULL,
	"provider_id" text,
	"status" text,
	"sent_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"builder" text,
	"mobile_ok" boolean NOT NULL,
	"has_en" boolean NOT NULL,
	"pagespeed" integer,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"text_excerpt" text,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_draft" ADD CONSTRAINT "email_draft_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_draft_id_email_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."email_draft"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analysis" ADD CONSTRAINT "site_analysis_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;