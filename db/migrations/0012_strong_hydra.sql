CREATE TABLE "suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"lead_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppression_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "clicked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "bounced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "complained_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "suppression" ADD CONSTRAINT "suppression_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;