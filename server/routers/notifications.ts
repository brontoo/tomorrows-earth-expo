import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { notifications, users } from "../../drizzle/schema.js";
import { eq, desc } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * Get all notifications for the current user
   */
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const userNotifications = await (db as any).query.notifications.findMany({
        where: eq(notifications.userId, ctx.user.id),
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
        offset: input.offset,
      }) as any[];

      return userNotifications;
    }),

  /**
   * Mark a notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await (db as any)
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

      await (db as any)
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, ctx.user.id));

    return { success: true };
  }),

  /**
   * Delete a notification
   */
  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify the notification belongs to the user
      const notif = await (db as any).query.notifications.findFirst({
        where: eq(notifications.id, input.notificationId),
      });

      if (!notif || notif.userId !== ctx.user.id) {
        throw new Error("Notification not found or unauthorized");
      }

      await (db as any)
        .delete(notifications)
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const unreadNotifications = await (db as any).query.notifications.findMany({
      where: eq(notifications.userId, ctx.user.id),
    }) as any[];

    const unreadCount = unreadNotifications.filter((n: any) => !n.read).length;
    return { unreadCount };
  }),

  /**
   * Send a test notification (admin only)
   */
  sendTestNotification: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        title: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // Only admins can send notifications
      if (ctx.user.role !== "admin") {
        throw new Error("Only administrators can send notifications");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify the target user exists
      const targetUser = await (db as any).query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("Target user not found");
      }

      // Create notification
      await (db as any).insert(notifications).values({
        userId: input.userId,
        type: "system_alert",
        title: input.title,
        message: input.message,
        read: false,
        createdAt: new Date(),
      });

      return { success: true, message: "Notification sent successfully" };
    }),

  /**
   * Send bulk notification to all users of a specific role (admin only)
   */
  sendBulkNotification: protectedProcedure
    .input(
      z.object({
        role: z.enum(["admin", "teacher", "student"]),
        title: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // Only admins can send bulk notifications
      if (ctx.user.role !== "admin") {
        throw new Error("Only administrators can send bulk notifications");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get all users with the specified role
      const targetUsers = (await (db as any).query.users.findMany({
        where: eq(users.role, input.role),
      })) as any[];

      if (targetUsers.length === 0) {
        return { success: true, recipientCount: 0, message: "No users found with that role" };
      }

      // Create notifications for all users
      const notificationRecords = targetUsers.map((user) => ({
        userId: user.id,
        type: "system_alert" as const,
        title: input.title,
        message: input.message,
        read: false,
        createdAt: new Date(),
      }));

      await (db as any).insert(notifications).values(notificationRecords as any);

      return {
        success: true,
        recipientCount: targetUsers.length,
        message: `Notification sent to ${targetUsers.length} ${input.role}s`,
      };
    }),
});
