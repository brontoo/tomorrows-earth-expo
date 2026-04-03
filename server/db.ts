import { eq, and, count } from "drizzle-orm";
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
  submissionHistory, InsertSubmissionHistory
} from "../drizzle/schema";
import { ENV } from './_core/env';

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

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return undefined;
  }

  try {
    const values: InsertUser = {
      email: user.email,
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
    if (user.role !== undefined) {
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
    return await getUserByEmail(user.email);
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

  const result = await db.insert(projects).values(project);
  return result;
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
  return db.select().from(journeyPosts).where(eq(journeyPosts.projectId, projectId));
}

export async function getAllJourneyPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(journeyPosts);
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
  return db.select().from(teachers);
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

// ============ TEACHER DASHBOARD - STUDENT SUBMISSIONS ============

export async function getTeacherStudentSubmissions(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.supervisorId, teacherId));
}

export async function getProjectsAwaitingReview(teacherId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(
    and(
      eq(projects.supervisorId, teacherId),
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
  
  const submissionList = await db.select().from(projects).where(eq(projects.supervisorId, teacherId));
  const pending = submissionList.filter(p => p.status === "submitted").length;
  const completed = submissionList.filter(p => p.status === "approved" || p.status === "rejected").length;
  
  return {
    totalStudents: submissionList.length,
    totalSubmissions: submissionList.length,
    pendingReviews: pending,
    completedReviews: completed,
  };
}
