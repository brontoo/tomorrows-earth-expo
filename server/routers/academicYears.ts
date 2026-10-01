// server/routers/academicYears.ts
// The scoring window every mission completion and point event belongs to.
import { publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";

export const academicYearsRouter = router({
  /** The academic year currently marked as current (falls back to the latest). */
  getCurrent: publicProcedure.query(async () => {
    const year = await db.getCurrentAcademicYear();
    return year ?? null;
  }),

  getAll: publicProcedure.query(async () => {
    return db.getAllAcademicYears();
  }),
});
