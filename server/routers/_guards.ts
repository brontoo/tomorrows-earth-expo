// server/routers/_guards.ts
// Shared tRPC guards for the missions / passport / impact routers.
// These mirror the inline guards in server/routers.ts (which are not exported)
// so the new sub-routers behave exactly like the existing ones.
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc.js";
import * as db from "../db.js";

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const teacherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access required" });
  }

  const canReview = await db.isProjectReviewer(ctx.user.id);
  if (!canReview) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account is not approved as a project reviewer",
    });
  }

  return next({ ctx });
});

export const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Student access required" });
  }
  return next({ ctx });
});
