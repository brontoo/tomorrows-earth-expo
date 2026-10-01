// server/routers/missionCompletions.ts
// Student side of the mission loop: start -> submit -> (teacher approves).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc.js";
import { studentProcedure } from "./_guards.js";
import * as db from "../db.js";

const missionInput = z.object({
  missionId: z.number().int().positive(),
  academicYearId: z.number().int().positive(),
});

export const missionCompletionsRouter = router({
  /** This student's completion row for one mission in one academic year. */
  getMine: studentProcedure.input(missionInput).query(async ({ ctx, input }) => {
    const completion = await db.getMissionCompletion(
      input.missionId,
      ctx.user.id,
      input.academicYearId,
    );
    return completion ?? null;
  }),

  /** Every completion of the signed-in student (used by the game journey map). */
  getMyList: studentProcedure
    .input(z.object({ academicYearId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const academicYearId =
        input?.academicYearId ?? (await db.getCurrentAcademicYear())?.id ?? null;
      if (!academicYearId) return [];
      return db.getStudentMissionCompletions(ctx.user.id, academicYearId);
    }),

  /** Idempotent: creating the same completion twice returns the existing row. */
  start: studentProcedure.input(missionInput).mutation(async ({ ctx, input }) => {
    const mission = await db.getMissionById(input.missionId);
    if (!mission || !mission.isPublished) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This mission is not available." });
    }

    const completion = await db.startMissionCompletion({
      missionId: input.missionId,
      studentId: ctx.user.id,
      academicYearId: input.academicYearId,
    });

    if (!completion) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not start the mission." });
    }

    return completion;
  }),

  /** Submits evidence + reflection for teacher review. */
  submit: studentProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        evidence: z.string().optional(),
        reflection: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const completion = await db.getMissionCompletionById(input.id);

      if (!completion || completion.studentId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mission completion not found." });
      }

      if (completion.status !== "in_progress" && completion.status !== "revision_requested") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This mission has already been submitted.",
        });
      }

      const mission = await db.getMissionById(completion.missionId);
      if (mission?.evidenceRequired && !(input.evidence ?? "").trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This mission requires an evidence note before it can be submitted.",
        });
      }

      const updated = await db.submitMissionCompletion({
        completionId: completion.id,
        studentId: ctx.user.id,
        evidence: input.evidence ?? null,
        reflection: input.reflection ?? null,
      });

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not submit the mission." });
      }

      return updated;
    }),
});
