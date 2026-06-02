CREATE TABLE "project_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vercel_project_id" text NOT NULL,
	"name" text,
	"build_price" integer,
	"monthly_price" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_meta_vercel_project_id_unique" UNIQUE("vercel_project_id")
);
