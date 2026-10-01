// server/routers/impact.ts
// Measured, teacher-verified sustainability impact.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc.js";
import { studentProcedure, teacherProcedure } from "./_guards.js";
import * as db from "../db.js";

const metricTypeSchema = z.enum([
  "water_liters",
  "electricity_kwh",
  "waste_kg",
  "recycling_kg",
  "plastic_items",
  "plants_added",
  "trees_added",
  "food_waste_kg",
  "transport_km",
  "custom",
]);

export const impactRouter = router({
  /** Public school-wide totals of verified impact (used by /impact). */
  getSchoolSummary: publicProcedure.query(async () => {
    return db.getSchoolImpactSummary();
  }),

  /** The signed-in student's own impact entries. */
  getMine: studentProcedure
    .input(z.object({ academicYearId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const academicYearId =
        input?.academicYearId ?? (await db.getCurrentAcademicYear())?.id ?? null;
      if (!academicYearId) return [];
      return db.getStudentImpactEntries(ctx.user.id, academicYearId);
    }),

  /** A student records a measurement; it stays pending until a teacher verifies it. */
  submit: studentProcedure
    .input(
      z.object({
        metricType: metricTypeSchema,
        quantity: z.number().int(),
        unit: z.string().min(1).max(40),
        metricLabel: z.string().max(160).optional(),
        missionId: z.number().int().positive().optional(),
        evidenceUrl: z.string().max(1000).optional(),
        academicYearId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const academicYearId =
        input.academicYearId ?? (await db.getCurrentAcademicYear())?.id ?? null;

      if (!academicYearId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No academic year is configured yet.",
        });
      }

      const created = await db.createImpactEntry({
        academicYearId,
        studentId: ctx.user.id,
        missionId: input.missionId ?? null,
        metricType: input.metricType,
        metricLabel: input.metricLabel ?? null,
        quantity: input.quantity,
        unit: input.unit,
        evidenceUrl: input.evidenceUrl ?? null,
        verificationStatus: "pending",
      });

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save the impact entry." });
      }

      return created;
    }),

  /** Teacher queue of pending impact measurements. */
  getVerificationQueue: teacherProcedure.query(async () => {
    return db.getImpactEntriesAwaitingReview();
  }),

  /** Teacher verifies or rejects a measurement. */
  review: teacherProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        decision: z.enum(["verify", "reject"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.reviewImpactEntry({
        id: input.id,
        decision: input.decision,
        reviewerId: ctx.user.id,
      });
    }),
});
