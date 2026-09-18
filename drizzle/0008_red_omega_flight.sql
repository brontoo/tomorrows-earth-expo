CREATE TYPE "public"."impact_metric_type" AS ENUM('water_liters', 'electricity_kwh', 'waste_kg', 'recycling_kg', 'plastic_items', 'plants_added', 'trees_added', 'food_waste_kg', 'transport_km', 'custom');--> statement-breakpoint
CREATE TYPE "public"."impact_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "impact_entries" (
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
