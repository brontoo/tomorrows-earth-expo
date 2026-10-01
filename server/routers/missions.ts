// server/routers/missions.ts
// Read-only mission catalogue for the student mission pages and the game hub.
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";

export const missionsRouter = router({
  /** Published missions, optionally limited to one sustainability zone. */
  getAll: publicProcedure
    .input(z.object({ zoneSlug: z.string().min(1).optional() }).optional())
    .query(async ({ input }) => {
      return db.getPublishedMissions(input?.zoneSlug);
    }),

  /** Single published mission by slug (used by /missions/:slug). */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const mission = await db.getMissionBySlug(input.slug);
      return mission ?? null;
    }),

  /** Active sustainability zones (thematic grouping). */
  getZones: publicProcedure.query(async () => {
    return db.getSustainabilityZones();
  }),
});
