/**
 * Admin-specific database functions
 * Handles user management, analytics, system configuration, and platform settings
 */

import { eq, and } from "drizzle-orm";
import { 
  users, projects, votes, systemConfig, resources, 
  submissionHistory, projectFeedback
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ USER MANAGEMENT ============

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, role as any));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] || null;
}

export async function updateUserStatus(userId: number, approved: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approved }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

export async function deactivateUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approved: false }).where(eq(users.id, userId));
}

export async function activateUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ approved: true }).where(eq(users.id, userId));
}

// ============ ANALYTICS ============

export async function getPlatformStats() {
  const db = await getDb();
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

  const allUsers = await db.select().from(users);
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
  const db = await getDb();
  if (!db) {
    return {
      eventDate: "2026-05-14",
      eventLocation: "Um Al-Emarat School",
      eventDescription: "",
      votingOpen: false,
      votingStartDate: "",
      votingEndDate: "",
      submissionDeadline: "2026-04-30",
    };
  }

  // Get from systemConfig table
  const configs = await db.select().from(systemConfig);
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.key] = c.value;
  });

  return {
    eventDate: configMap["eventDate"] || "2026-05-14",
    eventLocation: configMap["eventLocation"] || "Um Al-Emarat School",
    eventDescription: configMap["eventDescription"] || "",
    votingOpen: configMap["votingOpen"] === "true",
    votingStartDate: configMap["votingStartDate"] || "",
    votingEndDate: configMap["votingEndDate"] || "",
    submissionDeadline: configMap["submissionDeadline"] || "2026-04-30",
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
  const db = await getDb();
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
  const db = await getDb();
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
  const db = await getDb();
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
  const db = await getDb();
  if (!db) return [];
  
  const submissions = await db.select().from(submissionHistory).orderBy(submissionHistory.createdAt).limit(limit);
  const feedback = await db.select().from(projectFeedback).orderBy(projectFeedback.createdAt).limit(limit);
  
  return [...submissions, ...feedback]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
