import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { hiddenForestEvidence, users } from "../../drizzle/schema.js";
import {
  forestActions,
  forestProgress,
  type ForestAction,
} from "../../shared/hiddenForest.js";
import { router } from "../_core/trpc.js";
import { getDb, getTeacherStudentSubmissions } from "../db.js";
import { studentProcedure, teacherProcedure } from "./_guards.js";

async function forestDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Forest progress storage is unavailable.",
    });
  return db;
}

async function ownedProgress(studentId: number) {
  const db = await forestDb();
  const rows = await db
    .select({ action: hiddenForestEvidence.action })
    .from(hiddenForestEvidence)
    .where(eq(hiddenForestEvidence.studentId, studentId));
  return forestProgress(rows.map(row => row.action as ForestAction));
}

export const hiddenForestRouter = router({
  mine: studentProcedure
    .input(z.object({ cacheScope: z.string().max(100) }).strict())
    .query(({ ctx }) => ownedProgress(ctx.user.id)),
  observe: studentProcedure
    .input(z.object({ action: z.enum(forestActions) }).strict())
    .mutation(async ({ ctx, input }) => {
      const db = await forestDb();
      // Observations are educational engagement. The API never accepts user IDs,
      // discovery IDs, seal status, mastery or legacy points from the client.
      await db
        .insert(hiddenForestEvidence)
        .values({ studentId: ctx.user.id, action: input.action })
        .onConflictDoNothing();
      return ownedProgress(ctx.user.id);
    }),
  supervised: teacherProcedure.query(async ({ ctx }) => {
    const db = await forestDb();
    const submissions = await getTeacherStudentSubmissions(ctx.user.id);
    const ids = Array.from(
      new Set<number>(submissions.map(row => row.createdBy))
    );
    if (!ids.length) return [];
    const records = await db
      .select({
        studentId: users.id,
        name: users.name,
        action: hiddenForestEvidence.action,
      })
      .from(users)
      .innerJoin(
        hiddenForestEvidence,
        eq(users.id, hiddenForestEvidence.studentId)
      )
      .where(and(inArray(users.id, ids), eq(users.role, "student")));
    const students = new Map<
      number,
      { name: string; actions: ForestAction[] }
    >();
    for (const row of records) {
      const student = students.get(row.studentId) ?? {
        name: row.name ?? "Student",
        actions: [],
      };
      student.actions.push(row.action as ForestAction);
      students.set(row.studentId, student);
    }
    return Array.from(students.entries()).map(([id, row]) => ({
      id,
      name: row.name,
      ...forestProgress(row.actions),
    }));
  }),
});
