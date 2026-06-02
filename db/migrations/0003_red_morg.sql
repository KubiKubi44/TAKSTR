CREATE TABLE "telegram_state" (
	"chat_id" text PRIMARY KEY NOT NULL,
	"mode" text,
	"lead_id" uuid,
	"draft_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_state" ADD CONSTRAINT "telegram_state_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;