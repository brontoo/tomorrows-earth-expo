import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { notificationsRouter } from "./routers/notifications";
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
  notifications: notificationsRouter,

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

  projects: router({
    getAll: publicProcedure.query(async () => {
      return db.getAllProjects();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectById(input.id);
      }),
    getByCategory: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectsByCategory(input.categoryId);
      }),
    getBySubcategory: publicProcedure
      .input(z.object({ subcategoryId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectsBySubcategory(input.subcategoryId);
      }),
    getByStatus: publicProcedure
      .input(z.object({ status: z.enum(["approved", "draft", "submitted", "rejected", "finalist"]) }))
      .query(async ({ input }) => {
        return db.getProjectsByStatus(input.status);
      }),
    getMyProjects: protectedProcedure.query(async ({ ctx }) => {
      return db.getProjectsByUser(ctx.user.id);
    }),
    getStats: publicProcedure.query(async () => {
      return db.getProjectStats();
    }),
    submitProject: studentProcedure
      .input(z.object({
        title: z.string().min(1, "Project title is required"),
        description: z.string().min(1, "Project description is required"),
        subcategoryId: z.number(),
        supervisorId: z.number(),
        documentUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subcategory = await db.getSubcategoryById(input.subcategoryId);
        if (!subcategory) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subcategory not found" });
        }

        const result = await db.createProject({
          title: input.title,
          description: input.description,
          teamName: ctx.user.name || "Team",
          categoryId: subcategory.categoryId,
          subcategoryId: input.subcategoryId,
          supervisorId: input.supervisorId,
          createdBy: ctx.user.id,
          grade: ctx.user.grade || "Unknown",
          status: "submitted",
          submittedAt: new Date(),
          documentUrls: input.documentUrls ? JSON.stringify(input.documentUrls) : null,
        });

        await db.createNotification({
          userId: input.supervisorId,
          type: "project_submitted",
          title: "New Project Submission",
          message: `${ctx.user.name} submitted a project: ${input.title}`,
          relatedProjectId: (result as any).insertId as number,
        });

        return { success: true, projectId: (result as any).insertId };
      }),
    create: studentProcedure
      .input(z.object({
        title: z.string(),
        teamName: z.string(),
        categoryId: z.number(),
        grade: z.string(),
        teamMemberIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createProject({
          ...input,
          createdBy: ctx.user.id,
          teamMemberIds: input.teamMemberIds ? JSON.stringify(input.teamMemberIds) : null,
          status: "draft",
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        teamName: z.string().optional(),
        categoryId: z.number().optional(),
        abstract: z.string().optional(),
        scientificQuestion: z.string().optional(),
        sdgAlignment: z.array(z.number()).optional(),
        researchMethod: z.string().optional(),
        experimentDetails: z.string().optional(),
        dataExplanation: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
        model3dUrl: z.string().optional(),
        status: z.enum(["draft", "submitted", "approved", "rejected", "finalist"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, sdgAlignment, imageUrls, ...rest } = input;
        const project = await db.getProjectById(id);
        
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        if (
          project.createdBy !== ctx.user.id &&
          ctx.user.role !== "teacher" &&
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this project" });
        }
        
        await db.updateProject(id, {
          ...rest,
          sdgAlignment: sdgAlignment ? JSON.stringify(sdgAlignment) : undefined,
          imageUrls: imageUrls ? JSON.stringify(imageUrls) : undefined,
        });
        
        return { success: true };
      }),
    submit: studentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        
        if (!project || project.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateProject(input.id, {
          status: "submitted",
          submittedAt: new Date(),
        });
        
        return { success: true };
      }),
    approve: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProject(input.id, {
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
        
        return { success: true };
      }),
    reject: teacherProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProject(input.id, {
          status: "rejected",
          rejectionReason: input.reason,
        });
        
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        
        if (project.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.deleteProject(input.id);
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
