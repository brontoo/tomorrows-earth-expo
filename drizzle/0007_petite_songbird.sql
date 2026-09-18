CREATE TYPE "public"."badge_criteria_type" AS ENUM('mission_count', 'points_threshold', 'zone_count', 'sdg_count', 'verified_actions', 'manual');--> statement-breakpoint
CREATE TABLE "badges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(20),
	"criteria_type" "badge_criteria_type" NOT NULL,
	"criteria_config" text NOT NULL,
	"points_reward" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "student_badges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"badge_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"evidence" text
);
--> statement-breakpoint
CREATE TABLE "sustainability_levels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sustainability_levels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"min_points" integer NOT NULL,
	"icon" varchar(20),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sustainability_levels_name_unique" UNIQUE("name"),
	CONSTRAINT "sustainability_levels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "student_badges_badge_student_year_idx" ON "student_badges" USING btree ("badge_id","student_id","academic_year_id");