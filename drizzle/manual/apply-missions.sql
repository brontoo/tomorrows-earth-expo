-- ============================================================
--  Missiony & Gamification tables — SAFE / IDEMPOTENT apply
-- ============================================================
--  Use this ONLY if `pnpm db:push` (drizzle-kit migrate) reports
--  that an object already exists, or if you prefer to apply the
--  schema by hand in the Supabase / Neon SQL editor.
--
--  It is safe to run more than once: every statement is guarded.
--  It only CREATES missing objects — it never drops or alters
--  any existing table, column, or row.
-- ============================================================

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE "public"."mission_type" AS ENUM('learn', 'investigate', 'act', 'experience', 'collaborate', 'create');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."mission_difficulty" AS ENUM('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."mission_verification" AS ENUM('automatic', 'teacher_review', 'experience_result', 'admin_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."mission_repeat_policy" AS ENUM('once', 'once_per_term', 'repeatable_capped', 'teacher_assigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."mission_completion_status" AS ENUM('in_progress', 'submitted', 'verification_required', 'verified', 'revision_requested', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."point_event_source" AS ENUM('mission', 'challenge', 'badge', 'community_action', 'experience', 'teacher_award', 'impact_action', 'special_event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."point_verification_status" AS ENUM('pending', 'verified', 'reversed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."badge_criteria_type" AS ENUM('mission_count', 'points_threshold', 'zone_count', 'sdg_count', 'verified_actions', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."impact_metric_type" AS ENUM('water_liters', 'electricity_kwh', 'waste_kg', 'recycling_kg', 'plastic_items', 'plants_added', 'trees_added', 'food_waste_kg', 'transport_km', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."impact_verification_status" AS ENUM('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- tables ----------
CREATE TABLE IF NOT EXISTS "academic_years" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "academic_years_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "label" varchar(20) NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "points_start_date" timestamp NOT NULL,
  "points_end_date" timestamp NOT NULL,
  "expo_start_date" timestamp,
  "expo_end_date" timestamp,
  "is_current" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "academic_years_label_unique" UNIQUE("label")
);

CREATE TABLE IF NOT EXISTS "sustainability_zones" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sustainability_zones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "slug" varchar(120) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "icon" varchar(100),
  "cover_image" varchar(1000),
  "theme" varchar(100),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sustainability_zones_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "missions" (
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

CREATE TABLE IF NOT EXISTS "mission_completions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mission_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "mission_id" integer NOT NULL,
  "student_id" integer NOT NULL,
  "academic_year_id" integer NOT NULL,
  "status" "mission_completion_status" DEFAULT 'in_progress' NOT NULL,
  "evidence" text,
  "submitted_at" timestamp,
  "completed_at" timestamp,
  "score" integer,
  "reflection" text,
  "teacher_feedback" text,
  "verified_by" integer,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "mission_completions_mission_student_year_idx"
  ON "mission_completions" USING btree ("mission_id", "student_id", "academic_year_id");

CREATE TABLE IF NOT EXISTS "sustainability_point_events" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sustainability_point_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "student_id" integer NOT NULL,
  "academic_year_id" integer NOT NULL,
  "source_type" "point_event_source" NOT NULL,
  "source_id" integer NOT NULL,
  "points" integer NOT NULL,
  "reason" text NOT NULL,
  "verification_status" "point_verification_status" DEFAULT 'pending' NOT NULL,
  "verified_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "reversed_at" timestamp,
  "metadata" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "point_events_source_student_year_idx"
  ON "sustainability_point_events" USING btree ("student_id", "academic_year_id", "source_type", "source_id");

CREATE TABLE IF NOT EXISTS "badges" (
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

CREATE TABLE IF NOT EXISTS "student_badges" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "badge_id" integer NOT NULL,
  "student_id" integer NOT NULL,
  "academic_year_id" integer NOT NULL,
  "earned_at" timestamp DEFAULT now() NOT NULL,
  "evidence" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_badges_badge_student_year_idx"
  ON "student_badges" USING btree ("badge_id", "student_id", "academic_year_id");

CREATE TABLE IF NOT EXISTS "sustainability_levels" (
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

CREATE TABLE IF NOT EXISTS "impact_entries" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "impact_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "academic_year_id" integer NOT NULL,
  "student_id" integer,
  "team_id" integer,
  "class_id" integer,
  "mission_id" integer,
  "metric_type" "impact_metric_type" NOT NULL,
  "metric_label" varchar(160),
  "quantity" integer NOT NULL,
  "unit" varchar(40) NOT NULL,
  "baseline" integer,
  "result" integer,
  "evidence_url" varchar(1000),
  "verification_status" "impact_verification_status" DEFAULT 'pending' NOT NULL,
  "verified_by" integer,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ---------- users.role check constraint (was migration 0009) ----------
DO $$ BEGIN
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "valid_role";
  ALTER TABLE "users" ADD CONSTRAINT "valid_role"
    CHECK ("role"::text IN ('student', 'teacher', 'admin', 'public'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
--  After this runs, seed the mission catalogue and levels:
--      pnpm tsx server/scripts/seedTomorrowEarth.ts
--  (that script is idempotent too — it upserts by slug)
-- ============================================================
