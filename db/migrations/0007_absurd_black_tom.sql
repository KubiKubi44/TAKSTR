ALTER TABLE "project_meta" ADD COLUMN "client_name" text;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "client_email" text;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "client_phone" text;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "project_meta" ADD CONSTRAINT "project_meta_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;