ALTER TYPE "public"."event_kind" ADD VALUE 'invoice';--> statement-breakpoint
ALTER TYPE "public"."event_kind" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "color" text;