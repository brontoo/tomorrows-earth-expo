import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

type UserRole = "admin" | "teacher" | "student";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user ?? null;
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  loginWithEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
        role: z.enum(["admin", "teacher", "student"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);

      ctx.res.cookie(
        COOKIE_NAME,
        `mock-session-${input.role}`,
        {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        }
      );

      return {
        success: true,
        user: {
          id: 999999,
          email: input.email,
          name: "Mock User",
          role: input.role as UserRole,
        },
      };
    }),

  registerUser: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["admin", "teacher", "student"]),
        subject: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        message: `Mock registration successful for ${input.email}`,
      };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        grade: z.string().optional(),
        schoolClass: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        profile: input,
      };
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async () => {
      return { success: true };
    }),

  syncUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        openId: z.string(),
        role: z.enum(["admin", "teacher", "student"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = input.role ?? "student";
      const cookieOptions = getSessionCookieOptions(ctx.req);

      ctx.res.cookie(
        COOKIE_NAME,
        `mock-google-session-${role}`,
        {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        }
      );

      return {
        success: true,
        user: {
          id: 999999,
          email: input.email,
          name: input.name ?? "Google Mock User",
          role,
        },
      };
    }),

  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid token.",
        });
      }

      return {
        success: true,
        email: "mock@example.com",
      };
    }),
});