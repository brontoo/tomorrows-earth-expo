import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies.js";
import * as db from "../db.js";
import { sdk } from "../_core/sdk.js";

type UserRole = "admin" | "teacher" | "student" | "public";

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
        role: z.enum(["admin", "teacher", "student"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const normalizedEmail = input.email.toLowerCase();
      const existingUser = await db.getUserByEmail(normalizedEmail);

      if (!existingUser?.passwordHash || !(await bcrypt.compare(input.password, existingUser.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const ensuredUser = await db.upsertUser({
        email: normalizedEmail,
        openId: existingUser.openId ?? `email:${normalizedEmail}`,
        name: existingUser.name ?? normalizedEmail.split("@")[0] ?? "User",
        role: existingUser.role,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      if (!ensuredUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create or fetch user from database" });
      }

      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(ensuredUser.openId || `email:${input.email.toLowerCase()}`, {
          name: ensuredUser.name || "User",
          email: ensuredUser.email,
          role: ensuredUser.role,
        });
      } catch (err) {
        console.error("[Auth] Failed to sign session token:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Session signing failed. Contact an administrator." });
      }

      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: ensuredUser.id,
          email: ensuredUser.email,
          name: ensuredUser.name || "User",
          role: ensuredUser.role as UserRole,
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
    .mutation(async ({ ctx, input }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const normalizedEmail = input.email.toLowerCase();
      const passwordHash = await bcrypt.hash(input.password, 12);

      const newUser = await db.upsertUser({
        email: normalizedEmail,
        openId: `email:${normalizedEmail}`,
        name: input.fullName,
        role: input.role,
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      if (!newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to register user in database" });
      }

      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(newUser.openId || `email:${input.email.toLowerCase()}`, {
          name: newUser.name || "User",
          email: newUser.email,
          role: newUser.role,
        });
      } catch (err) {
        console.error("[Auth] Failed to sign session token:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Session signing failed." });
      }

      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name || "User",
          role: newUser.role as UserRole,
        },
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
        role: z.enum(["admin", "teacher", "student", "public", "visitor"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedRole: UserRole | undefined =
        input.role === "visitor" ? "public" : (input.role as UserRole);

      const ensuredUser = await db.upsertUser({
        email: input.email,
        openId: input.openId,
        name: input.name ?? input.email.split("@")[0] ?? "User",
        role: normalizedRole,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      if (!ensuredUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to sync user" });
      }

      const cookieOptions = getSessionCookieOptions(ctx.req);
      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(ensuredUser.openId || input.openId, {
          name: ensuredUser.name || "User",
          email: ensuredUser.email,
          role: ensuredUser.role,
        });
      } catch (err) {
        console.error("[Auth] Failed to sign session token in syncUser:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Session signing failed. Contact an administrator." });
      }

      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: ensuredUser.id,
          email: ensuredUser.email,
          name: ensuredUser.name ?? "User",
          role: ensuredUser.role as UserRole,
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
        email: "verified@example.com",
      };
    }),
});