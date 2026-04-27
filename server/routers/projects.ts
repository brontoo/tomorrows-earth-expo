import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";
import { InsertProject } from "../../drizzle/schema.js";
import { canSubmitProjects, SUBMISSION_DEADLINE } from "../../shared/const.js";

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
        supervisorId: z.number().int().positive("Supervisor ID is required").optional(),
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

      if (!canSubmitProjects()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Submissions are closed. The deadline was ${SUBMISSION_DEADLINE.toUTCString()}.`,
        });
      }

      try {
        // Validate subcategory belongs to the declared category
        const subcategory = await db.getSubcategoryById(input.subcategoryId);
        if (!subcategory || subcategory.categoryId !== input.categoryId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subcategory does not belong to the selected category",
          });
        }

        // Some legacy clients store teacher table IDs instead of users.id.
        // Ignore invalid supervisor IDs and keep the field nullable in DB.
        let supervisorId: number | null = null;
        if (input.supervisorId) {
          const teacher = await db.getTeacherByUserId(input.supervisorId);
          supervisorId = teacher ? input.supervisorId : null;
        }

        const projectData: InsertProject = {
          title: input.title,
          teamName: input.teamName,
          description: input.description,
          grade: input.grade,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          supervisorId,
          createdBy: ctx.user.id,
          status: "submitted",
          submittedAt: new Date(),
          imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
          videoUrl: input.videoUrl || null,
          documentUrls: input.documentUrls ? JSON.stringify(input.documentUrls) : null,
        };

        const result = await db.insertProject(projectData);
        await db.createSubmissionHistory({
          projectId: result.id,
          action: "submitted",
          changedBy: ctx.user.id,
          previousStatus: null,
          newStatus: "submitted",
        });

        if (supervisorId) {
          await db.createNotification({
            userId: supervisorId,
            type: "project_submitted",
            title: "New Project Submitted",
            message: `${ctx.user.name || "A student"} submitted a new project: "${input.title}"`,
            relatedProjectId: result.id,
          });
        }

        return { success: true, projectId: result.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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

  // ─── مشاريع عامة للزوار (صفحة التصويت) ─────────────────────────────
  getPublic: publicProcedure.query(async () => {
    try {
      return await db.getPublicProjects();
    } catch (error) {
      console.error("[TRPC] Failed to get public projects:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch projects" });
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

  // ─── حفظ مسودة (بدون بوابة الموعد النهائي) ──────────────────────────
  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        title: z.string().min(1),
        teamName: z.string().min(1),
        description: z.string().min(1),
        grade: z.string().min(1),
        categoryId: z.number().int().positive(),
        subcategoryId: z.number().int().positive(),
        supervisorId: z.number().int().positive().optional(),
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
        throw new TRPCError({ code: "FORBIDDEN", message: "Only students can save drafts" });
      }

      try {
        const draftData = {
          title: input.title,
          teamName: input.teamName,
          description: input.description,
          grade: input.grade,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
          videoUrl: input.videoUrl || null,
          documentUrls: input.documentUrls ? JSON.stringify(input.documentUrls) : null,
        };

        if (input.id) {
          const existing = await db.getProjectById(input.id);
          if (!existing || existing.createdBy !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
          if (existing.status !== "draft") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Only drafts can be updated this way" });
          }
          await db.updateProject(input.id, draftData);
          return { success: true, projectId: input.id };
        }

        // New draft
        let supervisorId: number | null = null;
        if (input.supervisorId) {
          const teacher = await db.getTeacherByUserId(input.supervisorId);
          supervisorId = teacher ? input.supervisorId : null;
        }
        const result = await db.insertProject({
          ...draftData,
          supervisorId,
          createdBy: ctx.user.id,
          status: "draft",
        });
        return { success: true, projectId: result.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to save draft:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save draft" });
      }
    }),

  // ─── تعديل مشروع (قبل الموعد النهائي فقط) ────────────────────────────
  updateMyProject: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).optional(),
        teamName: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        grade: z.string().min(1).optional(),
        categoryId: z.number().int().positive().optional(),
        subcategoryId: z.number().int().positive().optional(),
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
        throw new TRPCError({ code: "FORBIDDEN", message: "Only students can edit their projects" });
      }

      if (new Date() > SUBMISSION_DEADLINE) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `The submission deadline has passed (${SUBMISSION_DEADLINE.toUTCString()}).`,
        });
      }

      try {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        if (project.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Cross-check subcategory when both IDs are present
        const categoryId = input.categoryId ?? project.categoryId;
        const subcategoryId = input.subcategoryId ?? project.subcategoryId;
        if (subcategoryId) {
          const subcategory = await db.getSubcategoryById(subcategoryId);
          if (!subcategory || subcategory.categoryId !== categoryId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Subcategory does not belong to the selected category",
            });
          }
        }

        const updates: Partial<InsertProject> = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.teamName !== undefined) updates.teamName = input.teamName;
        if (input.description !== undefined) updates.description = input.description;
        if (input.grade !== undefined) updates.grade = input.grade;
        if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
        if (input.subcategoryId !== undefined) updates.subcategoryId = input.subcategoryId;
        if (input.imageUrls !== undefined) updates.imageUrls = JSON.stringify(input.imageUrls);
        if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl;
        if (input.documentUrls !== undefined) updates.documentUrls = JSON.stringify(input.documentUrls);
        updates.status = "submitted";

        await db.updateProjectStatusWithHistory(input.id, updates, {
          action: "revised",
          changedBy: ctx.user.id,
          previousStatus: project.status,
          newStatus: "submitted",
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] Failed to update project:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update project" });
      }
    }),
});