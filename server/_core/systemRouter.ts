import { z } from "zod";
import postgres from "postgres";
import { notifyOwner } from "./notification.js";
import { adminProcedure, publicProcedure, router } from "./trpc.js";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /**
   * فحص اتصال قاعدة البيانات (قراءة فقط) — يشخّص أي بيئة نشر من المتصفح:
   *   /api/trpc/system.dbHealth?batch=1
   * يعيد المضيف والمنفذ ورمز الخطأ بدون أي بيانات حساسة.
   */
  dbHealth: publicProcedure.query(async () => {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      return { configured: false, ok: false, host: "-", port: "-", tls: "-", latencyMs: null, code: null, message: "DATABASE_URL is not set in this environment" };
    }

    const url = raw.trim().replace(/^["']|["']$/g, "");
    let host = "(unparseable)";
    let port = "-";
    let isLocal = false;
    let hasSslParam = false;
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
      port = parsed.port || "5432";
      isLocal = /^(localhost|127\.0\.0\.1|::1)$/i.test(host);
      hasSslParam = /[?&](sslmode|ssl)=/i.test(url);
    } catch {
      // keep defaults
    }

    const tls = isLocal || hasSslParam ? "from-url/default" : "require";
    const client = postgres(url, {
      max: 1,
      connect_timeout: 10,
      ...(isLocal || hasSslParam ? {} : { ssl: "require" as const }),
    });

    const startedAt = Date.now();
    try {
      await client`select 1 as ok`;
      return { configured: true, ok: true, host, port, tls, latencyMs: Date.now() - startedAt, code: null, message: null };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      return {
        configured: true,
        ok: false,
        host,
        port,
        tls,
        latencyMs: Date.now() - startedAt,
        code: err?.code ?? null,
        message: (err?.message ?? String(error)).slice(0, 300),
      };
    } finally {
      await client.end({ timeout: 5 }).catch(() => {});
    }
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
