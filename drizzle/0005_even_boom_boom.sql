CREATE TYPE "public"."mission_completion_status" AS ENUM('in_progress', 'submitted', 'verification_required', 'verified', 'revision_requested', 'completed', 'rejected');--> statement-breakpoint
CREATE TABLE "mission_completions" (
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
--> statement-breakpoint
CREATE UNIQUE INDEX "mission_completions_mission_student_year_idx" ON "mission_completions" USING btree ("mission_id","student_id","academic_year_id");