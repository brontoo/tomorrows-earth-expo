CREATE TABLE "rubric_scores" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rubric_scores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"feedback_id" integer NOT NULL,
	"rubric_id" integer NOT NULL,
	"criterion_id" varchar(255) NOT NULL,
	"score" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "rubic_scores" CASCADE;