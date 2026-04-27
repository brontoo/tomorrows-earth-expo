import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc.js";
import { adminRouter } from "./routers/admin.js";
import { authRouter } from "./routers/auth.js";
import { projectsRouter } from "./routers/projects.js";  // ← مرة واحدة فقط
import { notificationsRouter } from "./routers/notifications.js";
import * as db from "./db.js";
import { storagePut } from "./storage.js";
import { nanoid } from "nanoid";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Teacher procedure (teacher or admin)
const teacherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
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

// Student procedure
const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Student access required" });
  }
  return next({ ctx });
});

// Per-IP rate limit for voting: max 1 request per 5 seconds
const votingRateLimit = new Map<string, number>();

function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: authRouter,
  projects: projectsRouter,
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
        voterIdentifier: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const ip = getClientIp(ctx.req);
        const now = Date.now();
        const lastVote = votingRateLimit.get(ip) ?? 0;
        if (now - lastVote < 5_000) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a moment before voting again" });
        }
        votingRateLimit.set(ip, now);

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
    getUserVotes: publicProcedure
      .input(z.object({ voterIdentifier: z.string().min(1).max(255) }))
      .query(async ({ input }) => {
        const rows = await db.getVotesByVoter(input.voterIdentifier);
        return rows.map((r) => r.projectId);
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

  news: router({
    getEnvironment: publicProcedure.query(async () => {
      const apiKey = process.env.GUARDIAN_API_KEY;
      if (!apiKey) {
        return [];
      }

      try {
        const params = new URLSearchParams({
          section: "environment",
          q: "sustainability OR climate OR renewable",
          "order-by": "newest",
          "page-size": "3",
          "show-fields": "thumbnail,trailText",
          "api-key": apiKey,
        });

        const response = await fetch(`https://content.guardianapis.com/search?${params.toString()}`);

        if (!response.ok) {
          return [];
        }

        const stripHtml = (input: string) => input.replace(/<[^>]*>/g, "").trim();
        const keywords = ["sustainability", "climate", "energy", "environment"];

        const payload = await response.json() as {
          response?: {
            results?: Array<{
              sectionId?: string;
              webTitle?: string;
              webUrl?: string;
              webPublicationDate?: string;
              fields?: {
                thumbnail?: string;
                trailText?: string;
              };
            }>;
          };
        };

        return (payload.response?.results || [])
          .filter((article) => article.sectionId === "environment")
          .filter((article) => {
            const title = (article.webTitle || "").toLowerCase();
            return keywords.some((keyword) => title.includes(keyword));
          })
          .slice(0, 3)
          .map((article) => ({
            title: article.webTitle || "Untitled article",
            url: article.webUrl || "#",
            source: "The Guardian",
            image: article.fields?.thumbnail || null,
            description: article.fields?.trailText
              ? stripHtml(article.fields.trailText)
              : "Read the latest sustainability development from environmental reporting.",
            publishedAt: article.webPublicationDate || null,
          }));
      } catch {
        return [];
      }
    }),
  }),

  wildlife: router({
    getObservations: publicProcedure.query(async () => {
      try {
        const token = process.env.INATURALIST_API_TOKEN;
        const response = await fetch(
          "https://api.inaturalist.org/v1/observations?iconic_taxa=Aves,Mammalia,Reptilia,Amphibia,Actinopterygii,Insecta,Animalia&photos=true&per_page=3&order=desc&order_by=created_at",
          {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          }
        );

        if (!response.ok) {
          return [];
        }

        const payload = await response.json() as {
          results?: Array<{
            id?: number;
            photos?: Array<{ url?: string }>;
            place_guess?: string;
            taxon?: { preferred_common_name?: string; name?: string };
            user?: { name?: string; login?: string };
          }>;
        };

        return (payload.results || []).slice(0, 3).map((item) => {
          const originalPhoto = item.photos?.[0]?.url || null;
          const mediumPhoto = originalPhoto ? originalPhoto.replace("square", "medium") : null;

          return {
            id: item.id ?? Math.random(),
            imageUrl: mediumPhoto,
            speciesName:
              item.taxon?.preferred_common_name ||
              item.taxon?.name ||
              "Unknown Species",
            location: item.place_guess || "Location unavailable",
            observer: item.user?.name || item.user?.login || null,
          };
        });
      } catch {
        return [];
      }
    }),
  }),

  upload: router({
    getUploadUrl: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ALLOWED_MIME_TYPES = new Set([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ]);

        if (!ALLOWED_MIME_TYPES.has(input.contentType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File type "${input.contentType}" is not allowed. Accepted types: images (JPEG, PNG, WebP), videos (MP4, WebM), and documents (PDF, Word, PowerPoint).`,
          });
        }

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
        teacherName: z.string().min(1),
        mainCategoryId: z.number().int().positive(),
        subcategoryId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getAssignmentByStudentId(ctx.user.id);
        if (existing) {
          if (existing.status === "assigned") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment is locked. Contact your teacher to make changes." });
          }
          // Unlocked or reset — allow update
          return db.updateAssignment(ctx.user.id, input);
        }
        return db.createAssignment({
          studentId: ctx.user.id,
          teacherName: input.teacherName,
          mainCategoryId: input.mainCategoryId,
          subcategoryId: input.subcategoryId,
        });
      }),
    getByTeacher: teacherProcedure.query(async ({ ctx }) => {
      if (!ctx.user.name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Teacher name not configured" });
      }
      return db.getAssignmentsByTeacherName(ctx.user.name);
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

    // ─── قبول المشروع ────────────────────────────────────────────────────
    approve: teacherProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.updateProjectStatusWithHistory(
            input.id,
            { status: "approved", approvedBy: ctx.user.id, approvedAt: new Date() },
            { action: "approved", changedBy: ctx.user.id, previousStatus: project.status, newStatus: "approved" },
          );

          if (project.createdBy) {
            await db.createNotification({
              userId: project.createdBy,
              type: "project_approved",
              title: "Project Approved",
              message: `Your project "${project.title}" has been approved!`,
              relatedProjectId: project.id,
            });
          }

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[TRPC] Failed to approve project:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to approve project" });
        }
      }),

    // ─── إرجاع المشروع للمراجعة ──────────────────────────────────────────
    reject: teacherProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().min(1, "Rejection reason is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.updateProjectStatusWithHistory(
            input.id,
            { status: "rejected", rejectionReason: input.reason },
            { action: "rejected", changedBy: ctx.user.id, notes: input.reason, previousStatus: project.status, newStatus: "rejected" },
          );

          if (project.createdBy) {
            await db.createNotification({
              userId: project.createdBy,
              type: "project_rejected",
              title: "Project Needs Revision",
              message: `Your project "${project.title}" has been returned for revision. Reason: ${input.reason}`,
              relatedProjectId: project.id,
            });
          }

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[TRPC] Failed to reject project:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to reject project" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
