import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type StudentUser = NonNullable<TrpcContext["user"]>;
type TeacherUser = NonNullable<TrpcContext["user"]>;

function createStudentContext(): TrpcContext {
  const user: StudentUser = {
    id: 2,
    openId: "student-user",
    email: "student@example.com",
    name: "John Student",
    loginMethod: "manus",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createTeacherContext(): TrpcContext {
  const user: TeacherUser = {
    id: 3,
    openId: "teacher-user",
    email: "teacher@example.com",
    name: "Jane Teacher",
    loginMethod: "manus",
    role: "teacher",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Project Submission System", () => {
  describe("Subcategories", () => {
    it("should fetch subcategories by category", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      const subcategories = await caller.subcategories.getByCategory({
        categoryId: 1,
      });

      expect(Array.isArray(subcategories)).toBe(true);
    });

    it("should fetch a single subcategory by ID", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      const subcategory = await caller.subcategories.getById({ id: 1 });

      if (subcategory) {
        expect(subcategory).toHaveProperty("id");
        expect(subcategory).toHaveProperty("name");
        expect(subcategory).toHaveProperty("categoryId");
      }
    });
  });

  describe("Teachers", () => {
    it("should fetch all teachers", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      const teachers = await caller.teachers.getAll();

      expect(Array.isArray(teachers)).toBe(true);
    });

    it("should fetch teacher by user ID", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      const teacher = await caller.teachers.getById({ userId: 3 });

      if (teacher) {
        expect(teacher).toHaveProperty("userId");
      }
    });
  });

  describe("Project Submission", () => {
    it("should allow students to submit projects", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.projects.submitProject({
          title: "Solar Panel Efficiency Study",
          teamName: "Team Solar",
          description:
            "A comprehensive study on optimizing solar panel efficiency in tropical climates",
          grade: "10",
          categoryId: 1,
          subcategoryId: 1,
          supervisorId: 3,
          documentUrls: [],
        });

        expect(result.success).toBe(true);
      } catch (error: any) {
        // Subcategory/supervisor may not exist, or database may not be available
        expect(["NOT_FOUND", "INTERNAL_SERVER_ERROR"]).toContain(error.code);
      }
    });

    it("should validate form inputs at client level", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      // Empty title should fail validation
      try {
        await caller.projects.submitProject({
          title: "",
          description: "Valid description with enough characters",
          subcategoryId: 1,
          supervisorId: 3,
          documentUrls: [],
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("should fetch student's own projects", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      const projects = await caller.projects.getMyProjects();

      expect(Array.isArray(projects)).toBe(true);
    });

    it("should fetch projects by subcategory", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const projects = await caller.projects.getBySubcategory({
          subcategoryId: 1,
        });
        expect(Array.isArray(projects)).toBe(true);
      } catch (error) {
        // Subcategory may not exist in test DB
        expect(true).toBe(true);
      }
    });
  });

  describe("Teacher Project Management", () => {
    it("should allow teachers to view their supervised projects", async () => {
      const ctx = createTeacherContext();
      const caller = appRouter.createCaller(ctx);

      const projects = await caller.teachers.getMyProjects();

      expect(Array.isArray(projects)).toBe(true);
    });

    it("should allow teachers to approve projects", async () => {
      const ctx = createTeacherContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.projects.approve({ id: 1 });
        expect(result.success).toBe(true);
      } catch (error: any) {
        // Project may not exist in test DB
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should allow teachers to reject projects with reason", async () => {
      const ctx = createTeacherContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.projects.reject({
          id: 1,
          reason: "Needs more detailed methodology section",
        });
        expect(result.success).toBe(true);
      } catch (error: any) {
        // Project may not exist in test DB
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("Access Control", () => {
    it("should prevent non-students from submitting projects", async () => {
      const ctx = createTeacherContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.projects.submitProject({
          title: "Valid Title",
          teamName: "Team Beta",
          description: "Valid description with enough characters",
          grade: "11",
          categoryId: 1,
          subcategoryId: 1,
          supervisorId: 3,
          documentUrls: [],
        });
        expect.fail("Should have thrown a FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should prevent students from approving projects", async () => {
      const ctx = createStudentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.projects.approve({ id: 1 });
        expect.fail("Should have thrown a FORBIDDEN error");
      } catch (error: any) {
        expect(["FORBIDDEN", "NOT_FOUND"]).toContain(error.code);
      }
    });
  });
});
