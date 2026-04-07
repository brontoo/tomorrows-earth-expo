import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "teacher" | "student" | "public" = "public"): TrpcContext {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : role === "teacher" ? 2 : role === "student" ? 3 : 4,
    openId: `test-${role}`,
    email: `${role}@test.com`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    grade: null,
    schoolClass: null,
    approved: false,
    passwordResetToken: null,
    passwordResetExpires: null,
    emailVerified: false,
    verificationToken: null,
    verificationExpires: null
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => { },
    } as unknown as TrpcContext["res"],
  };
}

describe("Projects API", () => {
  it("should allow public users to get all categories", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.categories.getAll();
    expect(Array.isArray(categories)).toBe(true);
    if (categories.length > 0) {
      expect(categories[0]).toHaveProperty("id");
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("slug");
    }
  });

  it("should allow public users to get project stats", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.projects.getStats();
    expect(stats).toHaveProperty("totalProjects");
    expect(stats).toHaveProperty("totalStudents");
    expect(typeof stats.totalProjects).toBe("number");
    expect(typeof stats.totalStudents).toBe("number");
  });

  it("should allow students to get their own projects", async () => {
    const ctx = createTestContext("student");
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.projects.getMyProjects();
    expect(Array.isArray(projects)).toBe(true);
  });

  it("should allow teachers to get all projects", async () => {
    const ctx = createTestContext("teacher");
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.projects.getAll();
    expect(Array.isArray(projects)).toBe(true);
  });

  it("should allow admins to manage categories", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.categories.getAll();
    expect(Array.isArray(categories)).toBe(true);
  });

  it("should get voting leaderboard", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    const leaderboard = await caller.voting.getLeaderboard();
    expect(Array.isArray(leaderboard)).toBe(true);
  });

  it("should get all journey posts", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    const posts = await caller.journeyPosts.getAll();
    expect(Array.isArray(posts)).toBe(true);
  });

  it("should get all resources", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    const resources = await caller.resources.getAll();
    expect(Array.isArray(resources)).toBe(true);
  });
});

describe("Authorization", () => {
  it("should prevent non-students from creating projects", async () => {
    const ctx = createTestContext("public");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.create({
        title: "Test Project",
        teamName: "Test Team",
        categoryId: 1,
        grade: "10",
      })
    ).rejects.toThrow();
  });

  it("should prevent non-teachers from approving projects", async () => {
    const ctx = createTestContext("student");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.approve({ id: 1 })
    ).rejects.toThrow();
  });

  it("should prevent non-admins from creating categories", async () => {
    const ctx = createTestContext("teacher");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.categories.create({
        name: "Test Category",
        slug: "test-category",
        colorTheme: "test-color",
      })
    ).rejects.toThrow();
  });
});
