ALTER TABLE "calendar_event" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "next_invoice_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_project_id_project_meta_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_meta"("id") ON DELETE cascade ON UPDATE no action;