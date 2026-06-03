CREATE TYPE "public"."task_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "priority" "task_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_meta_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_meta"("id") ON DELETE set null ON UPDATE no action;