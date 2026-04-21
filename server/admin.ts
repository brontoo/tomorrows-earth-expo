/**
 * Admin-specific database functions
 * Handles user management, analytics, system configuration, and platform settings
 */

import { eq, and, inArray } from "drizzle-orm";
import { 
  users, projects, votes, systemConfig, resources,
  submissionHistory, projectFeedback, comments, journeyPosts,
  messages, notifications, rubricScores
} from "../drizzle/schema.js";
import * as coreDb from "./db.js";

function rolePriority(role: string | null | undefined): number {
  if (role === "admin") return 4;
  if (role === "teacher") return 3;
  if (role === "student") return 2;
  return 1;
}

function dateScore(value: Date | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function dedupeUsers<T extends { email: string; role: string; approved?: boolean | null; lastSignedIn?: Date | null; createdAt?: Date | null }>(rows: T[]): T[] {
  const byEmail = new Map<string, T>();

  for (const row of rows) {
    const key = row.email.toLowerCase();
    const existing = byEmail.get(key);

    if (!existing) {
      byEmail.set(key, row);
      continue;
    }

    const existingScore = rolePriority(existing.role) * 1000 + (existing.approved ? 100 : 0) + dateScore(existing.lastSignedIn || existing.createdAt);
    const currentScore = rolePriority(row.role) * 1000 + (row.approved ? 100 : 0) + dateScore(row.lastSignedIn || row.createdAt);

    if (currentScore >= existingScore) {
      byEmail.set(key, row);
    }
  }

  return Array.from(byEmail.values());
}

function normalizeName(name?: string | null): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeUsersForStats<T extends { name?: string | null; email: string; role: string; approved?: boolean | null; lastSignedIn?: Date | null; createdAt?: Date | null }>(rows: T[]): T[] {
  const byPerson = new Map<string, T>();

  for (const row of rows) {
    const normalizedEmail = String(row.email || "").toLowerCase();
    const normalizedPersonName = normalizeName(row.name);

    // Teachers/admins often exist under multiple emails (mock, supervisor, moe, oauth).
    // Prefer dedupe-by-name for staff roles while keeping students/public deduped by email.
    const dedupeKey =
      row.role === "teacher" || row.role === "admin"
        ? normalizedPersonName || normalizedEmail
        : normalizedEmail;

    const existing = byPerson.get(dedupeKey);
    if (!existing) {
      byPerson.set(dedupeKey, row);
      continue;
    }

    const existingEmail = String(existing.email || "").toLowerCase();
    const currentPreferred = normalizedEmail.includes("@moe.sch.ae") ? 1 : 0;
    const existingPreferred = existingEmail.includes("@moe.sch.ae") ? 1 : 0;

    const existingScore =
      existingPreferred * 1000000 +
      rolePriority(existing.role) * 1000 +
      (existing.approved ? 100 : 0) +
      dateScore(existing.lastSignedIn || existing.createdAt);

    const currentScore =
      currentPreferred * 1000000 +
      rolePriority(row.role) * 1000 +
      (row.approved ? 100 : 0) +
      dateScore(row.lastSignedIn || row.createdAt);

    if (currentScore >= existingScore) {
      byPerson.set(dedupeKey, row);
    }
  }

  return Array.from(byPerson.values());
}

// ============ USER MANAGEMENT ============

export async function getAllUsers() {
  const db = await coreDb.getDb();
  if (!db) return [];
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return dedupeUsers(rows);
}

export async function getUsersByRole(role: string) {
  const db = await coreDb.getDb();
  if (!db) return [];
  const rows = await db.select().from(users).where(eq(users.role, role as any));
  return dedupeUsers(rows);
}

export async function getUserById(userId: number) {
  const db = await coreDb.getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] || null;
}

export async function updateUserStatus(userId: number, approved: boolean) {
  const db = await coreDb.getDb();
  if (!db) return;
  await db.update(users).set({ approved }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await coreDb.getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

export async function deactivateUser(userId: number) {
  const db = await coreDb.getDb();
  if (!db) return;
  await db.update(users).set({ approved: false }).where(eq(users.id, userId));
}

export async function activateUser(userId: number) {
  const db = await coreDb.getDb();
  if (!db) return;
  await db.update(users).set({ approved: true }).where(eq(users.id, userId));
}

// ============ ANALYTICS ============

export async function getPlatformStats() {
  const db = await coreDb.getDb();
  if (!db) {
    return {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalAdmins: 0,
      totalProjects: 0,
      approvedProjects: 0,
      pendingProjects: 0,
      totalVotes: 0,
    };
  }

  const allUsersRaw = await db.select().from(users);
  const allUsers = dedupeUsersForStats(allUsersRaw);
  const allProjects = await db.select().from(projects);
  const allVotes = await db.select().from(votes);

  return {
    totalUsers: allUsers.length,
    totalStudents: allUsers.filter(u => u.role === "student").length,
    totalTeachers: allUsers.filter(u => u.role === "teacher").length,
    totalAdmins: allUsers.filter(u => u.role === "admin").length,
    totalProjects: allProjects.length,
    approvedProjects: allProjects.filter(p => p.status === "approved").length,
    pendingProjects: allProjects.filter(p => p.status === "submitted").length,
    totalVotes: allVotes.length,
  };
}

// ============ SYSTEM CONFIGURATION ============

export async function getEventSettings() {
  const db = await coreDb.getDb();
  if (!db) {
    return {
      eventDate: "2026-05-20",
      eventLocation: "Um Al-Emarat School",
      eventDescription: "",
      votingOpen: false,
      votingStartDate: "",
      votingEndDate: "",
      submissionDeadline: "2026-05-05",
    };
  }

  // Get from systemConfig table
  const configs = await db.select().from(systemConfig);
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.key] = c.value;
  });

  return {
    eventDate: configMap["eventDate"] || "2026-05-20",
    eventLocation: configMap["eventLocation"] || "Um Al-Emarat School",
    eventDescription: configMap["eventDescription"] || "",
    votingOpen: configMap["votingOpen"] === "true",
    votingStartDate: configMap["votingStartDate"] || "",
    votingEndDate: configMap["votingEndDate"] || "",
    submissionDeadline: configMap["submissionDeadline"] || "2026-05-05",
  };
}

export async function updateEventSettings(settings: {
  eventDate?: string;
  eventLocation?: string;
  eventDescription?: string;
  votingOpen?: boolean;
  votingStartDate?: string;
  votingEndDate?: string;
  submissionDeadline?: string;
}) {
  const db = await coreDb.getDb();
  if (!db) return;

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    
    const stringValue = typeof value === "boolean" ? (value ? "true" : "false") : value;
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    
    if (existing.length > 0) {
      await db.update(systemConfig).set({ value: stringValue }).where(eq(systemConfig.key, key));
    } else {
      await db.insert(systemConfig).values({ key, value: stringValue });
    }
  }
}

// ============ VOTING MANAGEMENT ============

export async function getVotingStats() {
  const db = await coreDb.getDb();
  if (!db) {
    return {
      totalVotes: 0,
      topProjects: [],
      votingOpen: false,
    };
  }

  const allVotes = await db.select().from(votes);
  
  // Count votes per project
  const voteCounts: Record<number, number> = {};
  allVotes.forEach(vote => {
    voteCounts[vote.projectId] = (voteCounts[vote.projectId] || 0) + 1;
  });

  // Get top projects
  const topProjectIds = Object.entries(voteCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => parseInt(id));

  const topProjects = await Promise.all(
    topProjectIds.map(async (id) => {
      const project = await db.select().from(projects).where(eq(projects.id, id));
      return {
        ...project[0],
        voteCount: voteCounts[id],
      };
    })
  );

  const configs = await db.select().from(systemConfig);
  const votingOpen = configs.find(c => c.key === "votingOpen")?.value === "true";

  return {
    totalVotes: allVotes.length,
    topProjects,
    votingOpen,
  };
}

export async function toggleVoting(open: boolean) {
  const db = await coreDb.getDb();
  if (!db) return;
  
  const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, "votingOpen"));
  const value = open ? "true" : "false";
  
  if (existing.length > 0) {
    await db.update(systemConfig).set({ value }).where(eq(systemConfig.key, "votingOpen"));
  } else {
    await db.insert(systemConfig).values({ key: "votingOpen", value });
  }
}

// ============ ACTIVITY LOGS ============

export async function getActivityLogs(limit: number = 50) {
  const db = await coreDb.getDb();
  if (!db) return [];
  
  const submissions = await db.select().from(submissionHistory).orderBy(submissionHistory.createdAt).limit(limit);
  const feedback = await db.select().from(projectFeedback).orderBy(projectFeedback.createdAt).limit(limit);
  
  return [...submissions, ...feedback]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ============ JOURNEY CINEMA MANAGEMENT ============

export async function getJourneyPostsForAdmin() {
  return coreDb.getAllJourneyPosts();
}

export async function deleteJourneyPostForAdmin(id: number) {
  await coreDb.deleteJourneyPost(id);
}

// ============ PROJECT MANAGEMENT ============

export async function getAllProjectsForAdmin() {
  return coreDb.getAllProjects();
}

export async function deleteProjectForAdmin(id: number) {
  const project = await coreDb.getProjectById(id);
  if (!project) {
    throw new Error("Project not found");
  }

  const db = await coreDb.getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete dependent rows first to avoid FK violations in production databases.
  const feedbackRows = await db
    .select({ id: projectFeedback.id })
    .from(projectFeedback)
    .where(eq(projectFeedback.projectId, id));

  if (feedbackRows.length > 0) {
    const feedbackIds = feedbackRows.map((f) => f.id);
    await db.delete(rubricScores).where(inArray(rubricScores.feedbackId, feedbackIds));
  }

  await db.delete(votes).where(eq(votes.projectId, id));
  await db.delete(comments).where(eq(comments.projectId, id));
  await db.delete(journeyPosts).where(eq(journeyPosts.projectId, id));
  await db.delete(submissionHistory).where(eq(submissionHistory.projectId, id));
  await db.delete(projectFeedback).where(eq(projectFeedback.projectId, id));
  await db.delete(messages).where(eq(messages.projectId, id));
  await db.delete(notifications).where(eq(notifications.relatedProjectId, id));

  await db.delete(projects).where(eq(projects.id, id));
}
