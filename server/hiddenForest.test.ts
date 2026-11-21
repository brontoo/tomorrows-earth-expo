import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forestActions,
  forestDiscoveryIds,
  forestDiscoveryRules,
  forestProgress,
  type ForestAction,
} from "../shared/hiddenForest";
import type { TrpcContext } from "./_core/context";
import { getDb, getTeacherStudentSubmissions, isProjectReviewer } from "./db";
import { hiddenForestRouter } from "./routers/hiddenForest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getTeacherStudentSubmissions: vi.fn(),
  isProjectReviewer: vi.fn(),
}));

const dialect = new PgDialect();

function caller(role?: NonNullable<TrpcContext["user"]>["role"], id = 7) {
  return hiddenForestRouter.createCaller({
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: role ? ({ id, role } as TrpcContext["user"]) : null,
  });
}

beforeEach(() => vi.resetAllMocks());

describe("Hidden Forest discovery rules", () => {
  it("requires each observation in the rules and awards each discovery once", () => {
    const full = forestProgress([...forestActions, ...forestActions]);
    expect(full.discoveries).toHaveLength(12);
    expect(full.actions).toHaveLength(forestActions.length);
    expect(full.legacySeal).toBe(true);
    for (const id of forestDiscoveryIds) {
      for (const missing of forestDiscoveryRules[id]) {
        const partial = forestProgress(
          forestActions.filter(item => item !== missing)
        );
        expect(partial.discoveries).not.toContain(id);
        expect(partial.legacySeal).toBe(false);
      }
    }
  });
});

describe("Hidden Forest portal progress", () => {
  it("rejects unauthenticated reads, non-student writes, and forged fields", async () => {
    await expect(caller().mine({ cacheScope: "7" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller("teacher").observe({ action: "inspect-tree" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const forged = {
      action: "inspect-tree",
      studentId: 9,
      legacySeal: true,
    } as const;
    await expect(caller("student").observe(forged)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller("student").observe({ action: "made-up" as ForestAction })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("writes and retrieves only the session student's deduplicated observations", async () => {
    const rows = new Map<number, Set<ForestAction>>([
      [9, new Set(["follow-fish"])],
    ]);
    const values = vi.fn(
      ({ studentId, action }: { studentId: number; action: ForestAction }) => ({
        onConflictDoNothing: async () => {
          const actions = rows.get(studentId) ?? new Set();
          actions.add(action);
          rows.set(studentId, actions);
        },
      })
    );
    const where = vi.fn((predicate: SQL) => {
      const [id] = dialect.sqlToQuery(predicate).params as number[];
      return Array.from(rows.get(id) ?? [], action => ({ action }));
    });
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where }) }),
      insert: () => ({ values }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);

    await caller("student").observe({ action: "inspect-tree" });
    await caller("student").observe({ action: "inspect-tree" });
    expect(values).toHaveBeenCalledWith({
      studentId: 7,
      action: "inspect-tree",
    });
    const reopened = await caller("student").mine({ cacheScope: "9" });
    expect(reopened.actions).toEqual(["inspect-tree"]);
    expect(reopened.discoveries).toEqual(["grey-mangrove"]);
    expect(reopened.legacySeal).toBe(false);
    expect(
      (await caller("student", 9).mine({ cacheScope: "7" })).actions
    ).toEqual(["follow-fish"]);
  });

  it("requires approved reviewer access and bounds the teacher query to supervised IDs", async () => {
    vi.mocked(isProjectReviewer).mockResolvedValue(false);
    await expect(caller("teacher", 40).supervised()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getDb).not.toHaveBeenCalled();
    vi.mocked(isProjectReviewer).mockResolvedValue(true);
    vi.mocked(getTeacherStudentSubmissions).mockResolvedValue([
      { createdBy: 9 },
      { createdBy: 9 },
    ] as Awaited<ReturnType<typeof getTeacherStudentSubmissions>>);
    const where = vi.fn((predicate: SQL) => {
      expect(dialect.sqlToQuery(predicate).params).toEqual([9, "student"]);
      return [{ studentId: 9, name: "Learner", action: "visit-roots" }];
    });
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ innerJoin: () => ({ where }) }) }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);

    expect(await caller("teacher", 40).supervised()).toMatchObject([
      { id: 9, views: ["roots"] },
    ]);
    expect(getTeacherStudentSubmissions).toHaveBeenCalledWith(40);
  });
});
