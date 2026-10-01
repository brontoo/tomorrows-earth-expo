ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "valid_role";
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "valid_role" CHECK ("role"::text IN ('student', 'teacher', 'admin', 'public'));
