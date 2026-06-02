ALTER TABLE "lead" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."lead_source";--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('osm', 'manual', 'telegram');--> statement-breakpoint
ALTER TABLE "lead" ALTER COLUMN "source" SET DATA TYPE "public"."lead_source" USING "source"::"public"."lead_source";