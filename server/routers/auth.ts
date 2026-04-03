import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import * as db from "../db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "../_core/email";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  loginWithEmail: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      role: z.enum(["admin", "teacher", "student"]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await db.getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }
        
        const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
        if (!passwordMatch) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        if (!user.emailVerified) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please verify your email address before logging in.",
          });
        }
        
        // Verify user role matches requested role (admins can access any role)
        if (user.role !== input.role && user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `User is not a ${input.role}`,
          });
        }
        
        // Create session token using openId or email as fallback
        const identifier = user.openId || `email-${user.email}`;
        const sessionToken = await sdk.createSessionToken(identifier, {
          name: user.name || "",
          email: user.email,
          role: user.role,
          expiresInMs: ONE_YEAR_MS,
        });
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        // Update last signed in
        await db.upsertUser({
          email: user.email,
          openId: user.openId,
          lastSignedIn: new Date(),
        });
        
        return { 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role 
          } 
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Login error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Login failed. Please try again.",
        });
      }
    }),
  
  registerUser: publicProcedure
    .input(z.object({
      fullName: z.string().min(2, "Full name must be at least 2 characters"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(["admin", "teacher", "student"]),
      subject: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        // Create new user
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = await db.upsertUser({
          email: input.email,
          name: input.fullName,
          passwordHash,
          role: input.role,
          emailVerified: false,
          verificationToken,
          verificationExpires,
          lastSignedIn: new Date(),
        });
        
        if (!newUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user account",
          });
        }
        
        // Send verification email
        await sendVerificationEmail(input.email, verificationToken, input.fullName);
        
        return {
          success: true,
          message: "Registration successful. Please check your email to verify your account.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Registration error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed. Please try again.",
        });
      }
    }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      grade: z.string().optional(),
      schoolClass: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertUser({
        email: ctx.user.email,
        name: input.name,
        grade: input.grade,
        schoolClass: input.schoolClass,
      });
      return { success: true };
    }),

  updatePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(ctx.user.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account does not support password changes or user not found.",
        });
      }
      
      const passwordMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect current password.",
        });
      }
      
      const newHash = await bcrypt.hash(input.newPassword, 10);
      await db.updateUserPassword(user.id, newHash);
      
      return { success: true };
    }),

  syncUser: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      openId: z.string(), // This is the Supabase UID
      role: z.enum(["admin", "teacher", "student"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Auth] Syncing user from Google:", input.email);
        
        // 1. Find or create user in our DB
        let user = await db.getUserByEmail(input.email);
        
        let targetRole = input.role || (user?.role) || "student";

        // If user exists but was registered via email/password, we link them via openId
        const updatedUser = await db.upsertUser({
          email: input.email,
          name: input.name || user?.name || "Google User",
          openId: input.openId,
          role: targetRole as any,
          emailVerified: true, // Google emails are pre-verified
          lastSignedIn: new Date(),
          loginMethod: "google",
        });

        if (!updatedUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to sync user data",
          });
        }

        // 2. Create local session token
        const identifier = input.openId;
        const sessionToken = await sdk.createSessionToken(identifier, {
          name: updatedUser.name || "",
          email: updatedUser.email,
          role: updatedUser.role,
          expiresInMs: ONE_YEAR_MS,
        });

        // 3. Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role
          }
        };
      } catch (error) {
        console.error("[Auth] Sync error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to synchronize Google account.",
        });
      }
    }),

  verifyEmail: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.verifyUserEmail(input.token);
      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token.",
        });
      }
      return { success: true, email: user.email };
    }),
});
