// server/routers/index.ts
import { router } from "../_core/trpc.js";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { notificationsRouter } from "./notifications.js";
import { projectsRouter } from "./projects.js";

export const appRouter = router({
  admin: adminRouter,
  auth: authRouter,
  notifications: notificationsRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;