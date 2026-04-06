import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { projectsRouter } from "./routers/projects";  // ← مرة واحدة فقط
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Teacher procedure (teacher or admin)
const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access required" });
  }
  return next({ ctx });
});

// Student procedure
const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Student access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: authRouter,
  projects: projectsRouter,  // ← بدون notifications

  users: router({
    getAll: adminProcedure.query(async () => {
      return db.getAllTeachers();
    }),
    getPendingTeachers: adminProcedure.query(async () => {
      return db.getPendingTeachers();
    }),
    approveTeacher: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.approveTeacher(input.userId);
        return { success: true };
      }),
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "teacher", "student", "public"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  categories: router({
    getAll: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCategoryById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        colorTheme: z.string(),
        order: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        colorTheme: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, data);
        return { success: true };
      }),
  }),

  subcategories: router({
    getByCategory: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return db.getSubcategoriesByCategory(input.categoryId);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSubcategoryById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        order: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await db.createSubcategory(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSubcategory(id, data);
        return { success: true };
      }),
  }),

  teachers: router({
    getAll: publicProcedure.query(async () => {
      return db.getAllTeachersWithInfo();
    }),
    getById: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeacherByUserId(input.userId);
      }),
    getMyProjects: teacherProcedure.query(async ({ ctx }) => {
      return db.getProjectsBySupervisor(ctx.user.id);
    }),
    create: adminProcedure
      .input(z.object({
        userId: z.number(),
        department: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        maxStudents: z.number().default(10),
      }))
      .mutation(async ({ input }) => {
        const { expertise, ...rest } = input;
        await db.createTeacher({
          ...rest,
          expertise: expertise ? JSON.stringify(expertise) : null,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        department: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        maxStudents: z.number().optional(),
        currentStudents: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, expertise, ...rest } = input;
        await db.updateTeacher(id, {
          ...rest,
          expertise: expertise ? JSON.stringify(expertise) : undefined,
        });
        return { success: true };
      }),
  }),

  journeyPosts: router({
    getByProject: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getJourneyPostsByProject(input.projectId);
      }),
    getAll: publicProcedure.query(async () => {
      return db.getAllJourneyPosts();
    }),
    create: studentProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string(),
        content: z.string(),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
        weekNumber: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { imageUrls, ...rest } = input;
        await db.createJourneyPost({
          ...rest,
          createdBy: ctx.user.id,
          imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        });
        return { success: true };
      }),
    update: studentProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, imageUrls, ...rest } = input;
        await db.updateJourneyPost(id, {
          ...rest,
          imageUrls: imageUrls ? JSON.stringify(imageUrls) : undefined,
        });
        return { success: true };
      }),
    delete: studentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteJourneyPost(input.id);
        return { success: true };
      }),
  }),

  comments: router({
    getByProject: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getCommentsByProject(input.projectId);
      }),
    create: teacherProcedure
      .input(z.object({
        projectId: z.number(),
        content: z.string(),
        isInternal: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createComment({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
    delete: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteComment(input.id);
        return { success: true };
      }),
  }),

  voting: router({
    vote: publicProcedure
      .input(z.object({
        projectId: z.number(),
        voterIdentifier: z.string(),
      }))
      .mutation(async ({ input }) => {
        const hasVoted = await db.hasUserVoted(input.voterIdentifier, input.projectId);

        if (hasVoted) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already voted for this project" });
        }

        await db.createVote(input);
        return { success: true };
      }),
    getLeaderboard: publicProcedure.query(async () => {
      return db.getVotingLeaderboard();
    }),
    getVotesByProject: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const votes = await db.getVotesByProject(input.projectId);
        return { count: votes.length };
      }),
  }),

  config: router({
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return db.getSystemConfig(input.key);
      }),
    set: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.setSystemConfig(input.key, input.value);
        return { success: true };
      }),
  }),

  resources: router({
    getAll: publicProcedure.query(async () => {
      return db.getAllResources();
    }),
    getByType: publicProcedure
      .input(z.object({ type: z.enum(["toolkit", "rubric", "faq", "guide"]) }))
      .query(async ({ input }) => {
        return db.getResourcesByType(input.type);
      }),
    create: adminProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        type: z.enum(["toolkit", "rubric", "faq", "guide"]),
        fileUrl: z.string().optional(),
        content: z.string().optional(),
        order: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await db.createResource(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        fileUrl: z.string().optional(),
        content: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateResource(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteResource(input.id);
        return { success: true };
      }),
  }),

  upload: router({
    getUploadUrl: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileKey = `uploads/${ctx.user.id}/${nanoid()}-${input.filename}`;
        return { fileKey, uploadUrl: `/api/upload/${fileKey}` };
      }),
  }),

  assignments: router({
    getMyAssignment: studentProcedure.query(async ({ ctx }) => {
      return db.getAssignmentByStudentId(ctx.user.id);
    }),
    create: studentProcedure
      .input(z.object({
        teacherName: z.string(),
        mainCategoryId: z.number(),
        subcategoryId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getAssignmentByStudentId(ctx.user.id);
        if (existing && existing.status === "assigned") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment already locked" });
        }
        return db.createAssignment({
          studentId: ctx.user.id,
          teacherName: input.teacherName,
          mainCategoryId: input.mainCategoryId,
          subcategoryId: input.subcategoryId,
        });
      }),
    getAll: adminProcedure.query(async () => {
      return db.getAllAssignments();
    }),
    resetAssignment: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetAssignment(input.studentId);
        return { success: true };
      }),
  }),

  teacher: router({
    // Dashboard overview
    getStats: teacherProcedure.query(async ({ ctx }) => {
      return db.getTeacherStats(ctx.user.id);
    }),

    // Student submissions
    getStudentSubmissions: teacherProcedure.query(async ({ ctx }) => {
      return db.getTeacherStudentSubmissions(ctx.user.id);
    }),

    getPendingReviews: teacherProcedure.query(async ({ ctx }) => {
      return db.getProjectsAwaitingReview(ctx.user.id);
    }),

    // Feedback and grading
    createFeedback: teacherProcedure
      .input(z.object({
        projectId: z.number(),
        feedbackText: z.string().optional(),
        score: z.number().min(0).max(100).optional(),
        needsRevision: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createProjectFeedback({
          projectId: input.projectId,
          teacherId: ctx.user.id,
          feedbackText: input.feedbackText,
          score: input.score,
          needsRevision: input.needsRevision,
          status: "draft",
        });
        return { success: true };
      }),

    getFeedback: teacherProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectFeedback(input.projectId);
      }),

    sendFeedback: teacherProcedure
      .input(z.object({ feedbackId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateProjectFeedback(input.feedbackId, { status: "sent" });
        return { success: true };
      }),

    // Rubrics
    createRubric: teacherProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        criteria: z.string(), // JSON string
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createRubric({
          teacherId: ctx.user.id,
          name: input.name,
          description: input.description,
          criteria: input.criteria,
        });
        return { success: true };
      }),

    getRubrics: teacherProcedure.query(async ({ ctx }) => {
      return db.getTeacherRubrics(ctx.user.id);
    }),

    // Messaging
    sendMessage: teacherProcedure
      .input(z.object({
        recipientId: z.number(),
        projectId: z.number().optional(),
        subject: z.string().optional(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.sendMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          projectId: input.projectId,
          subject: input.subject,
          content: input.content,
        });
        return { success: true };
      }),

    getMessages: teacherProcedure.query(async ({ ctx }) => {
      return db.getTeacherMessages(ctx.user.id);
    }),

    // Analytics
    getAnalytics: teacherProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        return db.getTeacherAnalytics(ctx.user.id, input.date);
      }),

    // Project history
    getProjectHistory: teacherProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectHistory(input.projectId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
