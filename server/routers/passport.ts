// server/routers/passport.ts
// The student "sustainability passport": points, level, badges, recent events
// and per-mission states (used by My Journey and the Eco-Journey game hub).
import { z } from "zod";
import { router } from "../_core/trpc.js";
import { studentProcedure, teacherProcedure } from "./_guards.js";
import * as db from "../db.js";

export const passportRouter = router({
  /** The signed-in student's passport for the current (or given) academic year. */
  getMine: studentProcedure
    .input(z.object({ academicYearId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getStudentPassport(ctx.user.id, input?.academicYearId);
    }),

  /** Teacher view of a single student's passport. */
  getForStudent: teacherProcedure
    .input(
      z.object({
        studentId: z.number().int().positive(),
        academicYearId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      return db.getStudentPassport(input.studentId, input.academicYearId);
    }),
});
