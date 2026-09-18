CREATE TYPE "public"."mission_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."mission_repeat_policy" AS ENUM('once', 'once_per_term', 'repeatable_capped', 'teacher_assigned');--> statement-breakpoint
CREATE TYPE "public"."mission_type" AS ENUM('learn', 'investigate', 'act', 'experience', 'collaborate', 'create');--> statement-breakpoint
CREATE TYPE "public"."mission_verification" AS ENUM('automatic', 'teacher_review', 'experience_result', 'admin_review');--> statement-breakpoint
CREATE TABLE "missions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "missions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"academic_year_id" integer NOT NULL,
	"zone_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"mission_type" "mission_type" NOT NULL,
	"difficulty" "mission_difficulty" DEFAULT 'easy' NOT NULL,
	"instructions" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"points_available" integer DEFAULT 0 NOT NULL,
	"evidence_required" boolean DEFAULT false NOT NULL,
	"verification_method" "mission_verification" DEFAULT 'teacher_review' NOT NULL,
	"repeat_policy" "mission_repeat_policy" DEFAULT 'once' NOT NULL,
	"sdg_ids" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "missions_slug_unique" UNIQUE("slug")
);
