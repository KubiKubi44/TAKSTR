ALTER TABLE "project_meta" ALTER COLUMN "vercel_project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "project_meta" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;