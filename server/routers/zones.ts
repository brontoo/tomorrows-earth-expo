// server/routers/zones.ts
// Sustainability zones (the thematic grouping of missions).
// The /explore and /explore/:slug pages already expect these procedures.
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc.js";
import * as db from "../db.js";

export const zonesRouter = router({
  getAll: publicProcedure.query(async () => {
    return db.getSustainabilityZones();
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const zone = await db.getSustainabilityZoneBySlug(input.slug);
      return zone ?? null;
    }),
});
