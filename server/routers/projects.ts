import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { InsertProject } from "../../drizzle/schema";

export const projectsRouter = router({
  submitProject: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        teamName: z.string().min(1, "Team name is required"),
        description: z.string().min(1, "Description is required"),
        grade: z.string().min(1, "Grade is required"),
        categoryId: z.number().int().positive("Category ID is required"),
        subcategoryId: z.number().int().positive("Subcategory ID is required"),
        supervisorId: z.number().int().positive("Supervisor ID is required"),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
        documentUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      if (ctx.user.role !== "student") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only students can submit projects" });
      }

      try {
        const projectData: InsertProject = {
          title: input.title,
          teamName: input.teamName,
          description: input.description,
          grade: input.grade,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          supervisorId: input.supervisorId,
          createdBy: ctx.user.id,
          status: "submitted",
          submittedAt: new Date(),
          imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
          videoUrl: input.videoUrl || null,
          documentUrls: input.documentUrls ? JSON.stringify(input.documentUrls) : null,
        };

        const result = await db.insertProject(projectData);
        return { success: true, projectId: result.id };
      } catch (error) {
        console.error("[TRPC] Failed to submit project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit project" });
      }
    }),

  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
    }

    if (ctx.user.role !== "student") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only students can view their projects" });
    }

    try {
      return await db.getProjectsByStudent(ctx.user.id);
    } catch (error) {
      console.error("[TRPC] Failed to get projects:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch projects" });
    }
  }),

  getProjectById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        if (
          ctx.user.role === "admin" ||
          project.createdBy === ctx.user.id ||
          project.supervisorId === ctx.user.id
        ) {
          return project;
        }

        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to get project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch project" });
      }
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      try {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        if (project.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteProject(input.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to delete project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete project" });
      }
    }),

  // ─── إحصائيات عامة للصفحة الرئيسية ──────────────────────────────────
  getStats: publicProcedure.query(async () => {
    return db.getProjectStats();
  }),

  // ─── قبول المشروع ────────────────────────────────────────────────────
  approve: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access required" });
      }

      try {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        await db.updateProject(input.id, {
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to approve project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to approve project" });
      }
    }),

  // ─── إرجاع المشروع للمراجعة ──────────────────────────────────────────
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().min(1, "Rejection reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access required" });
      }

      try {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        await db.updateProject(input.id, {
          status: "rejected",
          rejectionReason: input.reason,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to reject project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to reject project" });
      }
    }),

  // ─── جلب جميع المشاريع (للمدرس والأدمن) ─────────────────────────────
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    try {
      return await db.getAllProjects();
    } catch (error) {
      console.error("[TRPC] Failed to get all projects:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch projects" });
    }
  }),
});