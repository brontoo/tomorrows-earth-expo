import { describe, it, expect, beforeAll } from "vitest";
import * as adminDb from "./admin";

describe("Admin Database Functions", () => {
  describe("Platform Stats", () => {
    it("should return platform statistics", async () => {
      const stats = await adminDb.getPlatformStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("totalStudents");
      expect(stats).toHaveProperty("totalTeachers");
      expect(stats).toHaveProperty("totalAdmins");
      expect(stats).toHaveProperty("totalProjects");
      expect(stats).toHaveProperty("approvedProjects");
      expect(stats).toHaveProperty("pendingProjects");
      expect(stats).toHaveProperty("totalVotes");
      
      expect(typeof stats.totalUsers).toBe("number");
      expect(stats.totalUsers >= 0).toBe(true);
    });
  });

  describe("Event Settings", () => {
    it("should return event settings with defaults", async () => {
      const settings = await adminDb.getEventSettings();
      
      expect(settings).toBeDefined();
      expect(settings).toHaveProperty("eventDate");
      expect(settings).toHaveProperty("eventLocation");
      expect(settings).toHaveProperty("eventDescription");
      expect(settings).toHaveProperty("votingOpen");
      expect(settings).toHaveProperty("submissionDeadline");
      
      // Event date is set dynamically, just verify it's a valid date string
      expect(typeof settings.eventDate).toBe("string");
      expect(settings.eventLocation).toBe("Um Al-Emarat School");
      expect(typeof settings.votingOpen).toBe("boolean");
    });

    it("should update event settings", async () => {
      await adminDb.updateEventSettings({
        eventDate: "2026-05-15",
        eventLocation: "New Location",
      });

      const settings = await adminDb.getEventSettings();
      expect(settings.eventDate).toBe("2026-05-15");
      expect(settings.eventLocation).toBe("New Location");
      
      // Reset to original values
      await adminDb.updateEventSettings({
        eventDate: "2026-05-14",
        eventLocation: "Um Al-Emarat School",
      });
    });
  });

  describe("Voting Management", () => {
    it("should return voting statistics", async () => {
      const stats = await adminDb.getVotingStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalVotes");
      expect(stats).toHaveProperty("topProjects");
      expect(stats).toHaveProperty("votingOpen");
      
      expect(typeof stats.totalVotes).toBe("number");
      expect(Array.isArray(stats.topProjects)).toBe(true);
      expect(typeof stats.votingOpen).toBe("boolean");
    });

    it("should toggle voting status", async () => {
      const initialStats = await adminDb.getVotingStats();
      const initialStatus = initialStats.votingOpen;

      await adminDb.toggleVoting(!initialStatus);

      const updatedStats = await adminDb.getVotingStats();
      expect(updatedStats.votingOpen).toBe(!initialStatus);

      // Toggle back
      await adminDb.toggleVoting(initialStatus);
    });
  });

  describe("User Management", () => {
    it("should get all users", async () => {
      const users = await adminDb.getAllUsers();
      
      expect(Array.isArray(users)).toBe(true);
      if (users.length > 0) {
        expect(users[0]).toHaveProperty("id");
        expect(users[0]).toHaveProperty("email");
        expect(users[0]).toHaveProperty("role");
      }
    });

    it("should get users by role", async () => {
      const students = await adminDb.getUsersByRole("student");
      
      expect(Array.isArray(students)).toBe(true);
      students.forEach(user => {
        expect(user.role).toBe("student");
      });
    });
  });

  describe("Activity Logs", () => {
    it("should return activity logs", async () => {
      const logs = await adminDb.getActivityLogs(10);
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length <= 10).toBe(true);
    });
  });
});
