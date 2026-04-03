import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import * as adminDb from "../admin";

export const adminRouter = router({
  // User Management
  getAllUsers: adminProcedure.query(async () => {
    return adminDb.getAllUsers();
  }),
  
  getUsersByRole: adminProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      return adminDb.getUsersByRole(input.role);
    }),
  
  updateUserStatus: adminProcedure
    .input(z.object({ userId: z.number(), approved: z.boolean() }))
    .mutation(async ({ input }) => {
      await adminDb.updateUserStatus(input.userId, input.approved);
      return { success: true };
    }),
  
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await adminDb.deleteUser(input.userId);
      return { success: true };
    }),

  // Analytics
  getPlatformStats: adminProcedure.query(async () => {
    return adminDb.getPlatformStats();
  }),

  // Event Settings
  getEventSettings: adminProcedure.query(async () => {
    return adminDb.getEventSettings();
  }),
  
  updateEventSettings: adminProcedure
    .input(z.object({
      eventDate: z.string().optional(),
      eventLocation: z.string().optional(),
      eventDescription: z.string().optional(),
      votingOpen: z.boolean().optional(),
      votingStartDate: z.string().optional(),
      votingEndDate: z.string().optional(),
      submissionDeadline: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await adminDb.updateEventSettings(input);
      return { success: true };
    }),

  // Voting Management
  getVotingStats: adminProcedure.query(async () => {
    return adminDb.getVotingStats();
  }),
  
  toggleVoting: adminProcedure
    .input(z.object({ open: z.boolean() }))
    .mutation(async ({ input }) => {
      await adminDb.toggleVoting(input.open);
      return { success: true };
    }),

  // Activity Logs
  getActivityLogs: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return adminDb.getActivityLogs(input.limit);
    }),
});
