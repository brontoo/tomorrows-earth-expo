import { eq, and, count, inArray, asc, desc, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  User, InsertUser, users, 
  categories, InsertCategory,
  subcategories, InsertSubcategory,
  projects, InsertProject,
  journeyPosts, InsertJourneyPost,
  comments, InsertComment,
  votes, InsertVote,
  systemConfig, InsertSystemConfig,
  resources, InsertResource,
  notifications, InsertNotification,
  teachers, InsertTeacher,
  assignments, InsertAssignment, Assignment,
  projectFeedback, InsertProjectFeedback,
  rubrics, InsertRubric,
  rubricScores, InsertRubricScore,
  messages, InsertMessage,
  teacherAnalytics, InsertTeacherAnalytics,
  submissionHistory, InsertSubmissionHistory,
  academicYears, AcademicYear,
  sustainabilityZones, SustainabilityZone,
  missions, Mission,
  missionCompletions, MissionCompletion,
  sustainabilityPointEvents,
  badges, Badge,
  studentBadges,
  sustainabilityLevels, SustainabilityLevel,
  impactEntries, InsertImpactEntry,
} from "../drizzle/schema.js";
import { ENV } from './_core/env.js';
import { getStaffRegistryEntryByEmail } from "./staffRegistry.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export async function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!_db && dbUrl) {
    try {
      // Log connection attempt (masking sensitive info)
      const maskedUrl = dbUrl.replace(/:([^@]+)@/, ":****@");
      console.log(`[Database] Attempting to connect to: ${maskedUrl}`);
      
      _client = postgres(dbUrl, {
        // Connection options to help troubleshooting
        connect_timeout: 10,
        idle_timeout: 20,
        max_lifetime: 60 * 30,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.error("[Database] CRITICAL: Failed to connect to PostgreSQL:", error);
      _db = null;
    }
  } else if (!_db && !dbUrl) {
    console.error("[Database] ERROR: DATABASE_URL is missing in environment variables!");
  }
  return _db;
}

// ============ USER MANAGEMENT ============

export async function upsertUser(user: InsertUser) {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const normalizedEmail = user.email.toLowerCase();
  const canonicalStaff = getStaffRegistryEntryByEmail(normalizedEmail);

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return undefined;
  }

  try {
    const values: InsertUser = {
      email: normalizedEmail,
      openId: user.openId ?? undefined,
    };
    const updateSet: Record<string, any> = {};

    // Handle optional fields
    const optionalFields = [
      "name", "grade", "schoolClass", "loginMethod", "passwordHash", 
      "passwordResetToken", "emailVerified", "verificationToken", "verificationExpires",
      "openId"
    ] as const;
    
    optionalFields.forEach(field => {
      const value = user[field];
      if (value !== undefined) {
        (values as any)[field] = value;
        updateSet[field] = value;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (canonicalStaff) {
      const canonicalRole = canonicalStaff.role === "admin"
        ? "admin"
        : canonicalStaff.role === "teacher"
          ? "teacher"
          : "public";
      values.role = canonicalRole;
      updateSet.role = canonicalRole;
      values.name = canonicalStaff.name;
      updateSet.name = canonicalStaff.name;
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.approved !== undefined) {
      values.approved = user.approved;
      updateSet.approved = user.approved;
    }
    if (user.passwordResetExpires !== undefined) {
      values.passwordResetExpires = user.passwordResetExpires;
      updateSet.passwordResetExpires = user.passwordResetExpires;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.email,
      set: updateSet,
    });

    // Fetch and return the created/updated user
    return await getUserByEmail(normalizedEmail);
  } catch (error) {
    console.error("[Database] CRITICAL: Failed to upsert user. Error details:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update password: database not available");
    return;
  }

  try {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update password:", error);
    throw error;
  }
}

export async function verifyUserEmail(token: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
    const user = result[0];

    if (!user) return undefined;

    // Check if token is expired (if expires field is set)
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      return undefined;
    }

    await db.update(users).set({ 
      emailVerified: true, 
      verificationToken: null, 
      verificationExpires: null 
    }).where(eq(users.id, user.id));

    return await getUserByEmail(user.email);
  } catch (error) {
    console.error("[Database] Failed to verify email:", error);
    return undefined;
  }
}

// ============ CATEGORIES ============

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(categories).orderBy(categories.order);
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertCategory(category: InsertCategory): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(categories).values(category);
}

// ============ SUBCATEGORIES ============

export async function getSubcategoriesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId)).orderBy(subcategories.order);
}

export async function getSubcategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertSubcategory(subcategory: InsertSubcategory): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(subcategories).values(subcategory);
}

// ============ PROJECTS ============

export async function getProjectsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects).where(eq(projects.createdBy, studentId));
}

export async function getProjectsBySupervisor(supervisorId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects).where(eq(projects.supervisorId, supervisorId));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project).returning({ id: projects.id });
  return result[0];
}

// ============ TEACHERS ============

export async function getAllTeachers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(teachers);
}

export async function getTeacherByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(teachers).where(eq(teachers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function isProjectReviewer(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    return false;
  }

  if (userResult[0].role === "admin") {
    return true;
  }

  const teacherResult = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);

  return teacherResult.length > 0;
}

// ============ NOTIFICATIONS ============
export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
}

// ============ RESOURCES ============
export async function deleteResource(resourceId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(resources).where(eq(resources.id, resourceId));
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(notifications).values(data);
}

export async function getAllResources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resources);
}

export async function getResourcesByType(type: "toolkit" | "rubric" | "faq" | "guide") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resources).where(eq(resources.type, type));
}

export async function createResource(data: InsertResource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(resources).values(data);
}

export async function updateResource(id: number, data: Partial<InsertResource>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resources).set(data).where(eq(resources.id, id));
}

export async function getVotingLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    projectId: votes.projectId,
    voteCount: count(votes.id)
  }).from(votes).groupBy(votes.projectId);
  return result as Array<{ projectId: number; voteCount: number }>;
}

export async function getVotesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(votes).where(eq(votes.projectId, projectId));
}

export async function getSystemConfig(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSystemConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSystemConfig(key);
  if (existing) {
    await db.update(systemConfig).set({ value }).where(eq(systemConfig.key, key));
  } else {
    await db.insert(systemConfig).values({ key, value });
  }
}

export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(comments).values(data);
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(eq(comments.id, commentId));
}

export async function hasUserVoted(voterIdentifier: string, projectId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(votes).where(and(eq(votes.voterIdentifier, voterIdentifier), eq(votes.projectId, projectId))).limit(1);
  return result.length > 0;
}

export async function createVote(data: InsertVote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(votes).values(data);
}

export async function getVotesByVoter(voterIdentifier: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ projectId: votes.projectId })
    .from(votes)
    .where(eq(votes.voterIdentifier, voterIdentifier));
}

export async function updateJourneyPost(id: number, data: Partial<InsertJourneyPost>) {
  const db = await getDb();
  if (!db) return;
  await db.update(journeyPosts).set(data).where(eq(journeyPosts.id, id));
}

export async function deleteJourneyPost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(journeyPosts).where(eq(journeyPosts.id, id));
}

export async function getCommentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.projectId, projectId));
}

export async function getJourneyPostsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: journeyPosts.id,
      projectId: journeyPosts.projectId,
      title: journeyPosts.title,
      content: journeyPosts.content,
      imageUrls: journeyPosts.imageUrls,
      videoUrl: journeyPosts.videoUrl,
      weekNumber: journeyPosts.weekNumber,
      createdBy: journeyPosts.createdBy,
      createdAt: journeyPosts.createdAt,
      updatedAt: journeyPosts.updatedAt,
      studentName: users.name,
      studentEmail: users.email,
      projectTitle: projects.title,
      teamName: projects.teamName,
      projectGrade: projects.grade,
      projectCategoryId: projects.categoryId,
    })
    .from(journeyPosts)
    .leftJoin(users, eq(journeyPosts.createdBy, users.id))
    .leftJoin(projects, eq(journeyPosts.projectId, projects.id))
    .where(eq(journeyPosts.projectId, projectId));
}

export async function getAllJourneyPosts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: journeyPosts.id,
      projectId: journeyPosts.projectId,
      title: journeyPosts.title,
      content: journeyPosts.content,
      imageUrls: journeyPosts.imageUrls,
      videoUrl: journeyPosts.videoUrl,
      weekNumber: journeyPosts.weekNumber,
      createdBy: journeyPosts.createdBy,
      createdAt: journeyPosts.createdAt,
      updatedAt: journeyPosts.updatedAt,
      studentName: users.name,
      studentEmail: users.email,
      projectTitle: projects.title,
      teamName: projects.teamName,
      projectGrade: projects.grade,
      projectCategoryId: projects.categoryId,
    })
    .from(journeyPosts)
    .leftJoin(users, eq(journeyPosts.createdBy, users.id))
    .leftJoin(projects, eq(journeyPosts.projectId, projects.id));
}

export async function createJourneyPost(data: InsertJourneyPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(journeyPosts).values(data);
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projects).where(eq(projects.id, id));
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(projects).values(data);
}

export async function getProjectStats() {
  const db = await getDb();
  if (!db) return { totalProjects: 0, totalStudents: 0, totalCategories: 0 };
  const projectList = await db.select().from(projects);
  const categoryList = await db.select().from(categories);
  return {
    totalProjects: projectList.length,
    totalStudents: new Set(projectList.map(p => p.createdBy)).size,
    totalCategories: categoryList.length,
  };
}

export async function getProjectsBySubcategory(subcategoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.subcategoryId, subcategoryId));
}

export async function getProjectsByStatus(status: "approved" | "draft" | "submitted" | "rejected" | "finalist") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.status, status));
}

export async function getProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.createdBy, userId));
}

export async function updateTeacher(id: number, data: Partial<InsertTeacher>) {
  const db = await getDb();
  if (!db) return;
  await db.update(teachers).set(data).where(eq(teachers.id, id));
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects);
}

export async function getPublicProjects() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: projects.id,
      title: projects.title,
      teamName: projects.teamName,
      grade: projects.grade,
      status: projects.status,
      thumbnailUrl: projects.thumbnailUrl,
      abstract: projects.abstract,
      categoryId: projects.categoryId,
      subcategoryId: projects.subcategoryId,
    })
    .from(projects)
    .where(inArray(projects.status, ["approved", "finalist"]));
}

export async function getProjectsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.categoryId, categoryId));
}

export async function updateSubcategory(id: number, data: Partial<InsertSubcategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subcategories).set(data).where(eq(subcategories.id, id));
}

export async function getAllTeachersWithInfo() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teachers.id,
      userId: teachers.userId,
      department: teachers.department,
      expertise: teachers.expertise,
      maxStudents: teachers.maxStudents,
      currentStudents: teachers.currentStudents,
      createdAt: teachers.createdAt,
      updatedAt: teachers.updatedAt,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(teachers)
    .innerJoin(users, eq(teachers.userId, users.id));
}

export async function createTeacher(data: InsertTeacher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(teachers).values(data);
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(categories).values(data);
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function createSubcategory(data: InsertSubcategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(subcategories).values(data);
}

export async function approveTeacher(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role: role as any }).where(eq(users.id, userId));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingTeachers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "teacher"));
}


// ============ STUDENT ASSIGNMENTS ============

export async function getAssignmentByStudentId(studentId: number): Promise<Assignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assignments).where(eq(assignments.studentId, studentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAssignment(data: InsertAssignment): Promise<Assignment | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(assignments).values(data);
  return getAssignmentByStudentId(data.studentId);
}

export async function updateAssignment(
  studentId: number,
  data: Pick<InsertAssignment, "teacherName" | "mainCategoryId" | "subcategoryId">
): Promise<Assignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db
    .update(assignments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assignments.studentId, studentId));
  return getAssignmentByStudentId(studentId);
}

export async function updateAssignmentStatus(studentId: number, status: "assigned" | "unlocked" | "reset"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(assignments).set({ status }).where(eq(assignments.studentId, studentId));
}

export async function resetAssignment(studentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(assignments).set({ status: "unlocked" }).where(eq(assignments.studentId, studentId));
}

export async function getAllAssignments(): Promise<Assignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assignments);
}

export async function getAssignmentsByTeacherName(teacherName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: assignments.id,
      studentId: assignments.studentId,
      studentName: users.name,
      studentEmail: users.email,
      teacherName: assignments.teacherName,
      mainCategoryId: assignments.mainCategoryId,
      categoryName: categories.name,
      subcategoryId: assignments.subcategoryId,
      subcategoryName: subcategories.name,
      status: assignments.status,
      assignedAt: assignments.assignedAt,
    })
    .from(assignments)
    .innerJoin(users, eq(assignments.studentId, users.id))
    .leftJoin(categories, eq(assignments.mainCategoryId, categories.id))
    .leftJoin(subcategories, eq(assignments.subcategoryId, subcategories.id))
    .where(eq(assignments.teacherName, teacherName));
}

export async function getAssignmentsByStatus(status: "assigned" | "unlocked" | "reset"): Promise<Assignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assignments).where(eq(assignments.status, status));
}


// ============ TEACHER DASHBOARD - FEEDBACK & GRADING ============

export async function createProjectFeedback(feedback: InsertProjectFeedback): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectFeedback).values(feedback);
}

export async function getProjectFeedback(projectId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projectFeedback).where(eq(projectFeedback.projectId, projectId));
  return result[0] || null;
}

export async function updateProjectFeedback(feedbackId: number, updates: Partial<InsertProjectFeedback>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projectFeedback).set(updates).where(eq(projectFeedback.id, feedbackId));
}

export async function getTeacherFeedbacks(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectFeedback).where(eq(projectFeedback.teacherId, teacherId));
}

// ============ TEACHER DASHBOARD - RUBRICS ============

export async function createRubric(rubric: InsertRubric): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(rubrics).values(rubric);
}

export async function getTeacherRubrics(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rubrics).where(eq(rubrics.teacherId, teacherId));
}

export async function getRubricById(rubricId: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rubrics).where(eq(rubrics.id, rubricId));
  return result[0] || null;
}

export async function updateRubric(rubricId: number, updates: Partial<InsertRubric>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(rubrics).set(updates).where(eq(rubrics.id, rubricId));
}

export async function deleteRubric(rubricId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(rubrics).where(eq(rubrics.id, rubricId));
}

// ============ TEACHER DASHBOARD - RUBRIC SCORES ============

export async function createRubricScore(score: InsertRubricScore): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(rubricScores).values(score);
}

export async function getRubricScores(feedbackId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rubricScores).where(eq(rubricScores.feedbackId, feedbackId));
}

// ============ TEACHER DASHBOARD - MESSAGING ============

export async function sendMessage(message: InsertMessage): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(messages).values(message);
}

export async function getTeacherMessages(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.senderId, teacherId));
}

export async function getStudentMessages(studentId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.recipientId, studentId));
}

export async function markMessageAsRead(messageId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ isRead: true, readAt: new Date() }).where(eq(messages.id, messageId));
}

// ============ TEACHER DASHBOARD - ANALYTICS ============

export async function createTeacherAnalytics(analytics: InsertTeacherAnalytics): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(teacherAnalytics).values(analytics);
}

export async function getTeacherAnalytics(teacherId: number, date: string): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teacherAnalytics).where(
    and(eq(teacherAnalytics.teacherId, teacherId), eq(teacherAnalytics.date, date))
  );
  return result[0] || null;
}

export async function updateTeacherAnalytics(analyticsId: number, updates: Partial<InsertTeacherAnalytics>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(teacherAnalytics).set(updates).where(eq(teacherAnalytics.id, analyticsId));
}

// ============ TEACHER DASHBOARD - SUBMISSION HISTORY ============

export async function createSubmissionHistory(history: InsertSubmissionHistory): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(submissionHistory).values(history);
}

export async function getProjectHistory(projectId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(submissionHistory).where(eq(submissionHistory.projectId, projectId));
}

export async function updateProjectStatusWithHistory(
  projectId: number,
  updates: Partial<InsertProject>,
  history: Omit<InsertSubmissionHistory, "projectId">,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    await tx.update(projects).set(updates).where(eq(projects.id, projectId));
    await tx.insert(submissionHistory).values({ ...history, projectId });
  });
}

// ============ TEACHER DASHBOARD - STUDENT SUBMISSIONS ============

export async function getTeacherStudentSubmissions(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const scopedTeacherIds = await getTeacherScopeUserIds(teacherId);
  return db.select().from(projects).where(inArray(projects.supervisorId, scopedTeacherIds));
}

export async function getProjectsAwaitingReview(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const scopedTeacherIds = await getTeacherScopeUserIds(teacherId);
  return db.select().from(projects).where(
    and(
      inArray(projects.supervisorId, scopedTeacherIds),
      eq(projects.status, "submitted")
    )
  );
}

export async function getTeacherStats(teacherId: number): Promise<{
  totalStudents: number;
  totalSubmissions: number;
  pendingReviews: number;
  completedReviews: number;
}> {
  const db = await getDb();
  if (!db) return { totalStudents: 0, totalSubmissions: 0, pendingReviews: 0, completedReviews: 0 };

  const scopedTeacherIds = await getTeacherScopeUserIds(teacherId);
  
  const submissionList = await db.select().from(projects).where(inArray(projects.supervisorId, scopedTeacherIds));
  const pending = submissionList.filter(p => p.status === "submitted").length;
  const completed = submissionList.filter(p => p.status === "approved" || p.status === "rejected").length;
  
  return {
    totalStudents: submissionList.length,
    totalSubmissions: submissionList.length,
    pendingReviews: pending,
    completedReviews: completed,
  };
}

async function getTeacherScopeUserIds(teacherId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [teacherId];

  const current = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, teacherId))
    .limit(1);

  if (current.length === 0) {
    return [teacherId];
  }

  const ids = new Set<number>([teacherId]);
  const user = current[0];

  if (user.email) {
    const sameEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "teacher"), eq(users.email, user.email)));

    sameEmail.forEach((row) => ids.add(row.id));
  }

  if (user.name) {
    const sameName = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "teacher"), eq(users.name, user.name)));

    sameName.forEach((row) => ids.add(row.id));
  }

  return Array.from(ids);
}

/* ============================================================
 * SUSTAINABILITY MISSIONS & GAMIFICATION
 * ------------------------------------------------------------
 * ADDITIVE ONLY. Nothing above this line was modified.
 * These helpers power the missions / points / badges / passport /
 * impact routers that the mission pages already expect.
 * ============================================================ */

// ---------- Academic years ----------

export async function getAllAcademicYears(): Promise<AcademicYear[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(academicYears).orderBy(desc(academicYears.startDate));
}

export async function getAcademicYearById(id: number): Promise<AcademicYear | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
  return rows[0];
}

export async function getCurrentAcademicYear(): Promise<AcademicYear | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const current = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .orderBy(desc(academicYears.startDate))
    .limit(1);

  if (current.length > 0) return current[0];

  const latest = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.startDate))
    .limit(1);

  return latest[0];
}

// ---------- Zones & missions ----------

const missionCardColumns = {
  id: missions.id,
  academicYearId: missions.academicYearId,
  zoneId: missions.zoneId,
  title: missions.title,
  slug: missions.slug,
  description: missions.description,
  missionType: missions.missionType,
  difficulty: missions.difficulty,
  instructions: missions.instructions,
  estimatedMinutes: missions.estimatedMinutes,
  pointsAvailable: missions.pointsAvailable,
  evidenceRequired: missions.evidenceRequired,
  verificationMethod: missions.verificationMethod,
  repeatPolicy: missions.repeatPolicy,
  sdgIds: missions.sdgIds,
  zoneName: sustainabilityZones.name,
  zoneSlug: sustainabilityZones.slug,
  zoneIcon: sustainabilityZones.icon,
  zoneSortOrder: sustainabilityZones.sortOrder,
};

export async function getPublishedMissions(zoneSlug?: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select(missionCardColumns)
    .from(missions)
    .leftJoin(sustainabilityZones, eq(missions.zoneId, sustainabilityZones.id))
    .where(eq(missions.isPublished, true))
    .orderBy(asc(sustainabilityZones.sortOrder), asc(missions.id));

  if (!zoneSlug) return rows;
  return rows.filter((row) => row.zoneSlug === zoneSlug);
}

export async function getMissionBySlug(slug: string): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db
    .select(missionCardColumns)
    .from(missions)
    .leftJoin(sustainabilityZones, eq(missions.zoneId, sustainabilityZones.id))
    .where(and(eq(missions.slug, slug), eq(missions.isPublished, true)))
    .limit(1);

  return rows[0];
}

export async function getMissionById(id: number): Promise<Mission | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
  return rows[0];
}

export async function getSustainabilityZones(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sustainabilityZones)
    .where(eq(sustainabilityZones.isActive, true))
    .orderBy(asc(sustainabilityZones.sortOrder));
}

export async function getSustainabilityZoneBySlug(
  slug: string,
): Promise<SustainabilityZone | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db
    .select()
    .from(sustainabilityZones)
    .where(eq(sustainabilityZones.slug, slug))
    .limit(1);

  return rows[0];
}

// ---------- Mission completions ----------

export async function getMissionCompletion(
  missionId: number,
  studentId: number,
  academicYearId: number,
): Promise<MissionCompletion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db
    .select()
    .from(missionCompletions)
    .where(
      and(
        eq(missionCompletions.missionId, missionId),
        eq(missionCompletions.studentId, studentId),
        eq(missionCompletions.academicYearId, academicYearId),
      ),
    )
    .limit(1);

  return rows[0];
}

export async function getMissionCompletionById(
  id: number,
): Promise<MissionCompletion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db
    .select()
    .from(missionCompletions)
    .where(eq(missionCompletions.id, id))
    .limit(1);

  return rows[0];
}

export async function getStudentMissionCompletions(
  studentId: number,
  academicYearId: number,
): Promise<MissionCompletion[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(missionCompletions)
    .where(
      and(
        eq(missionCompletions.studentId, studentId),
        eq(missionCompletions.academicYearId, academicYearId),
      ),
    )
    .orderBy(asc(missionCompletions.id));
}

/**
 * Starts a mission for a student. Idempotent: a second call returns the
 * existing row instead of failing on the unique index.
 */
export async function startMissionCompletion(input: {
  missionId: number;
  studentId: number;
  academicYearId: number;
}): Promise<MissionCompletion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db
    .insert(missionCompletions)
    .values({
      missionId: input.missionId,
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      status: "in_progress",
    })
    .onConflictDoNothing();

  return getMissionCompletion(input.missionId, input.studentId, input.academicYearId);
}

export async function submitMissionCompletion(input: {
  completionId: number;
  studentId: number;
  evidence?: string | null;
  reflection?: string | null;
}): Promise<MissionCompletion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const rows = await db
    .update(missionCompletions)
    .set({
      status: "submitted",
      evidence: input.evidence ?? null,
      reflection: input.reflection ?? null,
      submittedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(missionCompletions.id, input.completionId),
        eq(missionCompletions.studentId, input.studentId),
      ),
    )
    .returning();

  return rows[0];
}

export async function getMissionVerificationQueue(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      completion: {
        id: missionCompletions.id,
        missionId: missionCompletions.missionId,
        studentId: missionCompletions.studentId,
        academicYearId: missionCompletions.academicYearId,
        status: missionCompletions.status,
        evidence: missionCompletions.evidence,
        reflection: missionCompletions.reflection,
        submittedAt: missionCompletions.submittedAt,
      },
      missionTitle: missions.title,
      missionSlug: missions.slug,
      missionPoints: missions.pointsAvailable,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(missionCompletions)
    .innerJoin(missions, eq(missionCompletions.missionId, missions.id))
    .leftJoin(users, eq(missionCompletions.studentId, users.id))
    .where(inArray(missionCompletions.status, ["submitted", "verification_required"]))
    .orderBy(asc(missionCompletions.submittedAt));
}

/**
 * Teacher decision on a submitted mission.
 *
 * On approval, in ONE transaction:
 *   1. marks the completion as completed / verified,
 *   2. writes a verified point event for the mission (idempotent),
 *   3. evaluates every active badge and awards the newly earned ones
 *      (each with its bonus point event).
 */
export async function reviewMissionCompletion(input: {
  completionId: number;
  decision: "approve" | "request_revision" | "reject";
  reviewerId: number;
  feedback?: string | null;
  score?: number | null;
}): Promise<{ status: string; awardedPoints: number; awardedBadges: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const completionRows = await tx
      .select()
      .from(missionCompletions)
      .where(eq(missionCompletions.id, input.completionId))
      .limit(1);

    const completion = completionRows[0];
    if (!completion) throw new Error("Mission completion not found");

    const approved = input.decision === "approve";
    const nextStatus =
      input.decision === "approve"
        ? "completed"
        : input.decision === "request_revision"
          ? "revision_requested"
          : "rejected";

    const now = new Date();
    await tx
      .update(missionCompletions)
      .set({
        status: nextStatus,
        score: input.score ?? completion.score ?? null,
        teacherFeedback: input.feedback ?? completion.teacherFeedback ?? null,
        verifiedBy: approved ? input.reviewerId : null,
        verifiedAt: approved ? now : null,
        completedAt: approved ? now : null,
        updatedAt: now,
      })
      .where(eq(missionCompletions.id, input.completionId));

    if (!approved) {
      return { status: nextStatus, awardedPoints: 0, awardedBadges: [] };
    }

    const missionRows = await tx
      .select({ id: missions.id, title: missions.title, pointsAvailable: missions.pointsAvailable })
      .from(missions)
      .where(eq(missions.id, completion.missionId))
      .limit(1);
    const mission = missionRows[0];

    let awardedPoints = 0;

    if (mission && mission.pointsAvailable > 0) {
      // The unique index on (student, year, source_type, source_id) makes this idempotent.
      await tx
        .insert(sustainabilityPointEvents)
        .values({
          studentId: completion.studentId,
          academicYearId: completion.academicYearId,
          sourceType: "mission",
          sourceId: completion.missionId,
          points: mission.pointsAvailable,
          reason: `Mission approved: ${mission.title}`,
          verificationStatus: "verified",
          verifiedBy: input.reviewerId,
        })
        .onConflictDoNothing();
      awardedPoints += mission.pointsAvailable;
    }

    // ---- badge evaluation (same transaction) ----
    const statsRows = await tx
      .select({
        missionId: missions.id,
        zoneId: missions.zoneId,
        zoneSlug: sustainabilityZones.slug,
        missionType: missions.missionType,
        sdgIds: missions.sdgIds,
      })
      .from(missionCompletions)
      .innerJoin(missions, eq(missionCompletions.missionId, missions.id))
      .leftJoin(sustainabilityZones, eq(missions.zoneId, sustainabilityZones.id))
      .where(
        and(
          eq(missionCompletions.studentId, completion.studentId),
          eq(missionCompletions.academicYearId, completion.academicYearId),
          inArray(missionCompletions.status, ["completed", "verified"]),
        ),
      );

    const pointRows = await tx
      .select({ points: sustainabilityPointEvents.points, status: sustainabilityPointEvents.verificationStatus })
      .from(sustainabilityPointEvents)
      .where(
        and(
          eq(sustainabilityPointEvents.studentId, completion.studentId),
          eq(sustainabilityPointEvents.academicYearId, completion.academicYearId),
        ),
      );

    const verifiedImpact = await tx
      .select({ id: impactEntries.id })
      .from(impactEntries)
      .where(
        and(
          eq(impactEntries.studentId, completion.studentId),
          eq(impactEntries.verificationStatus, "verified"),
        ),
      );

    const sdgNumbers = new Set<number>();
    for (const row of statsRows) {
      if (!row.sdgIds) continue;
      try {
        const parsed = JSON.parse(row.sdgIds);
        if (Array.isArray(parsed)) {
          for (const value of parsed) {
            const num = Number(value);
            if (Number.isFinite(num)) sdgNumbers.add(num);
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }

    const stats = {
      missionCount: statsRows.length,
      zoneCount: new Set(statsRows.map((row) => row.zoneId)).size,
      sdgCount: sdgNumbers.size,
      verifiedActions: verifiedImpact.length,
      totalPoints: pointRows
        .filter((row) => row.status === "verified")
        .reduce((total, row) => total + (row.points ?? 0), 0),
      countMatching: (config: { zoneSlug?: string; missionType?: string }) =>
        statsRows.filter((row) => {
          if (config.zoneSlug && row.zoneSlug !== config.zoneSlug) return false;
          if (config.missionType && row.missionType !== config.missionType) return false;
          return true;
        }).length,
    };

    const activeBadges = await tx.select().from(badges).where(eq(badges.isActive, true));
    const alreadyEarned = await tx
      .select({ badgeId: studentBadges.badgeId })
      .from(studentBadges)
      .where(
        and(
          eq(studentBadges.studentId, completion.studentId),
          eq(studentBadges.academicYearId, completion.academicYearId),
        ),
      );
    const earnedIds = new Set(alreadyEarned.map((row) => row.badgeId));
    const awardedBadges: string[] = [];

    for (const badge of activeBadges) {
      if (earnedIds.has(badge.id)) continue;

      let config: any = {};
      try {
        config = JSON.parse(badge.criteriaConfig ?? "{}");
      } catch {
        config = {};
      }

      const required = Number(config.count ?? config.points ?? 1) || 1;
      let met = false;

      switch (badge.criteriaType) {
        case "mission_count":
          met = stats.countMatching(config) >= required;
          break;
        case "points_threshold":
          met = stats.totalPoints >= Number(config.points ?? config.count ?? 1);
          break;
        case "zone_count":
          met = stats.zoneCount >= required;
          break;
        case "sdg_count":
          met = stats.sdgCount >= required;
          break;
        case "verified_actions":
          met = stats.verifiedActions >= required;
          break;
        case "manual":
        default:
          met = false;
      }

      if (!met) continue;

      const insertedBadge = await tx
        .insert(studentBadges)
        .values({
          badgeId: badge.id,
          studentId: completion.studentId,
          academicYearId: completion.academicYearId,
          evidence: badge.description,
        })
        .onConflictDoNothing()
        .returning({ id: studentBadges.id });

      // Another request already awarded it.
      if (insertedBadge.length === 0) continue;

      awardedBadges.push(badge.name);

      if (badge.pointsReward > 0) {
        await tx
          .insert(sustainabilityPointEvents)
          .values({
            studentId: completion.studentId,
            academicYearId: completion.academicYearId,
            sourceType: "badge",
            sourceId: badge.id,
            points: badge.pointsReward,
            reason: `Badge earned: ${badge.name}`,
            verificationStatus: "verified",
            verifiedBy: input.reviewerId,
          })
          .onConflictDoNothing();
        awardedPoints += badge.pointsReward;
      }
    }

    return { status: nextStatus, awardedPoints, awardedBadges };
  });
}

// ---------- Passport (points, levels, badges) ----------

export async function getSustainabilityLevels(): Promise<SustainabilityLevel[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sustainabilityLevels)
    .where(eq(sustainabilityLevels.isActive, true))
    .orderBy(asc(sustainabilityLevels.minPoints));
}

export async function getStudentPointsTotal(
  studentId: number,
  academicYearId: number,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ points: sustainabilityPointEvents.points, status: sustainabilityPointEvents.verificationStatus })
    .from(sustainabilityPointEvents)
    .where(
      and(
        eq(sustainabilityPointEvents.studentId, studentId),
        eq(sustainabilityPointEvents.academicYearId, academicYearId),
      ),
    );

  return rows
    .filter((row) => row.status === "verified")
    .reduce((total, row) => total + (row.points ?? 0), 0);
}

/**
 * The full student passport used by the My Journey page and the game hub.
 */
export type StudentPassport = {
  academicYear: { id: number; label: string } | null;
  totalPoints: number;
  completedMissions: number;
  currentLevel: SustainabilityLevel | null;
  nextLevel: SustainabilityLevel | null;
  badges: { badge: Badge; earnedAt: Date | null }[];
  recentEvents: {
    id: number;
    points: number;
    reason: string;
    sourceType: string;
    createdAt: Date;
  }[];
  missionStates: { missionId: number; status: string; score: number | null }[];
};

export async function getStudentPassport(
  studentId: number,
  academicYearId?: number,
): Promise<StudentPassport> {
  const db = await getDb();
  if (!db) {
    return {
      academicYear: null,
      totalPoints: 0,
      completedMissions: 0,
      currentLevel: null,
      nextLevel: null,
      badges: [],
      recentEvents: [],
      missionStates: [],
    };
  }

  const year = academicYearId
    ? await getAcademicYearById(academicYearId)
    : await getCurrentAcademicYear();

  const levels = await getSustainabilityLevels();
  const activeBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, true))
    .orderBy(asc(badges.id));

  if (!year) {
    return {
      academicYear: null,
      totalPoints: 0,
      completedMissions: 0,
      currentLevel: levels[0] ?? null,
      nextLevel: levels[1] ?? null,
      badges: activeBadges.map((badge) => ({ badge, earnedAt: null })),
      recentEvents: [],
      missionStates: [],
    };
  }

  const totalPoints = await getStudentPointsTotal(studentId, year.id);

  const completions = await getStudentMissionCompletions(studentId, year.id);
  const completedStatuses = new Set(["completed", "verified"]);
  const completedMissions = completions.filter((row) => completedStatuses.has(row.status)).length;

  const earnedRows = await db
    .select({ badgeId: studentBadges.badgeId, earnedAt: studentBadges.earnedAt })
    .from(studentBadges)
    .where(
      and(eq(studentBadges.studentId, studentId), eq(studentBadges.academicYearId, year.id)),
    );
  const earnedMap = new Map(earnedRows.map((row) => [row.badgeId, row.earnedAt]));

  const recentEvents = await db
    .select({
      id: sustainabilityPointEvents.id,
      points: sustainabilityPointEvents.points,
      reason: sustainabilityPointEvents.reason,
      sourceType: sustainabilityPointEvents.sourceType,
      createdAt: sustainabilityPointEvents.createdAt,
    })
    .from(sustainabilityPointEvents)
    .where(
      and(
        eq(sustainabilityPointEvents.studentId, studentId),
        eq(sustainabilityPointEvents.academicYearId, year.id),
        eq(sustainabilityPointEvents.verificationStatus, "verified"),
      ),
    )
    .orderBy(desc(sustainabilityPointEvents.createdAt))
    .limit(10);

  const currentLevel =
    [...levels].reverse().find((level) => totalPoints >= level.minPoints) ?? levels[0] ?? null;
  const nextLevel = levels.find((level) => totalPoints < level.minPoints) ?? null;

  return {
    academicYear: { id: year.id, label: year.label },
    totalPoints,
    completedMissions,
    currentLevel,
    nextLevel,
    badges: activeBadges.map((badge) => ({
      badge,
      earnedAt: earnedMap.get(badge.id) ?? null,
    })),
    recentEvents,
    missionStates: completions.map((row) => ({
      missionId: row.missionId,
      status: row.status,
      score: row.score,
    })),
  };
}

// ---------- Impact entries ----------

export async function getSchoolImpactSummary(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      metricType: impactEntries.metricType,
      unit: impactEntries.unit,
      total: sum(impactEntries.quantity),
    })
    .from(impactEntries)
    .where(eq(impactEntries.verificationStatus, "verified"))
    .groupBy(impactEntries.metricType, impactEntries.unit);

  return rows.map((row) => ({
    metricType: row.metricType,
    metricLabel: null,
    unit: row.unit,
    total: Number(row.total ?? 0),
  }));
}

export async function getStudentImpactEntries(
  studentId: number,
  academicYearId: number,
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(impactEntries)
    .where(
      and(
        eq(impactEntries.studentId, studentId),
        eq(impactEntries.academicYearId, academicYearId),
      ),
    )
    .orderBy(desc(impactEntries.createdAt));
}

export async function createImpactEntry(
  entry: InsertImpactEntry,
): Promise<{ id: number } | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db.insert(impactEntries).values(entry).returning({ id: impactEntries.id });
  return rows[0];
}

export async function reviewImpactEntry(input: {
  id: number;
  decision: "verify" | "reject";
  reviewerId: number;
}): Promise<{ status: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const rows = await db
    .update(impactEntries)
    .set({
      verificationStatus: input.decision === "verify" ? "verified" : "rejected",
      verifiedBy: input.reviewerId,
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(impactEntries.id, input.id))
    .returning({ status: impactEntries.verificationStatus });

  return { status: rows[0]?.status ?? "unknown" };
}

export async function getImpactEntriesAwaitingReview(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      entry: impactEntries,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(impactEntries)
    .leftJoin(users, eq(impactEntries.studentId, users.id))
    .where(eq(impactEntries.verificationStatus, "pending"))
    .orderBy(asc(impactEntries.createdAt));
}
