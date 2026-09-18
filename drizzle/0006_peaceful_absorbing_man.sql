CREATE TYPE "public"."point_event_source" AS ENUM('mission', 'challenge', 'badge', 'community_action', 'experience', 'teacher_award', 'impact_action', 'special_event');--> statement-breakpoint
CREATE TYPE "public"."point_verification_status" AS ENUM('pending', 'verified', 'reversed', 'rejected');--> statement-breakpoint
CREATE TABLE "sustainability_point_events" (
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
--> statement-breakpoint
CREATE UNIQUE INDEX "point_events_source_student_year_idx" ON "sustainability_point_events" USING btree ("student_id","academic_year_id","source_type","source_id");