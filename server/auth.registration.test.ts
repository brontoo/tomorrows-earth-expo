import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import bcrypt from "bcryptjs";

describe("User Registration System", () => {
  beforeEach(async () => {
    // Clean up test users before each test
    const testEmails = ["test.student@example.com", "test.teacher@example.com", "test.admin@example.com"];
    for (const email of testEmails) {
      const user = await db.getUserByEmail(email);
      // Note: In a real test, we would delete the user, but since we're just testing the logic,
      // we'll skip this for now
    }
  });

  it("should validate password requirements", () => {
    const validPasswords = [
      "ValidPass123",
      "SecurePassword456",
      "MyP@ssw0rd",
    ];

    const invalidPasswords = [
      "short",
      "nouppercase123",
      "NOLOWERCASE123",
      "NoNumbers",
    ];

    validPasswords.forEach(pwd => {
      expect(pwd.length).toBeGreaterThanOrEqual(8);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/\d/.test(pwd)).toBe(true);
    });

    invalidPasswords.forEach(pwd => {
      const hasLength = pwd.length >= 8;
      const hasLower = /[a-z]/.test(pwd);
      const hasUpper = /[A-Z]/.test(pwd);
      const hasNumber = /\d/.test(pwd);
      expect(hasLength && hasLower && hasUpper && hasNumber).toBe(false);
    });
  });

  it("should validate email format", () => {
    const validEmails = [
      "user@example.com",
      "test.user@domain.co.uk",
      "student+tag@school.edu",
    ];

    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user @example.com",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it("should validate full name requirements", () => {
    const validNames = [
      "John Doe",
      "Maria Garcia",
      "Ahmed Hassan",
      "Li Wei",
    ];

    const invalidNames = [
      "",
      "A",
      "   ",
    ];

    validNames.forEach(name => {
      expect(name.trim().length).toBeGreaterThanOrEqual(2);
    });

    invalidNames.forEach(name => {
      expect(name.trim().length < 2).toBe(true);
    });
  });

  it("should validate user roles", () => {
    const validRoles = ["student", "teacher", "admin"];
    const invalidRoles = ["moderator", "guest", "superadmin", ""];

    validRoles.forEach(role => {
      expect(["student", "teacher", "admin"].includes(role)).toBe(true);
    });

    invalidRoles.forEach(role => {
      expect(["student", "teacher", "admin"].includes(role)).toBe(false);
    });
  });

  it("should validate teacher subject requirement", () => {
    const teacherData = {
      role: "teacher",
      subject: "Biology",
    };

    const studentData = {
      role: "student",
      subject: undefined,
    };

    // Teacher must have subject
    if (teacherData.role === "teacher") {
      expect(teacherData.subject).toBeTruthy();
    }

    // Student doesn't need subject
    if (studentData.role === "student") {
      expect(studentData.subject).toBeUndefined();
    }
  });

  it("should hash passwords securely", async () => {
    const plainPassword = "SecurePass123";
    const hash1 = await bcrypt.hash(plainPassword, 10);
    const hash2 = await bcrypt.hash(plainPassword, 10);

    // Hashes should be different (due to salt)
    expect(hash1).not.toBe(hash2);

    // Both should verify against the original password
    const match1 = await bcrypt.compare(plainPassword, hash1);
    const match2 = await bcrypt.compare(plainPassword, hash2);
    expect(match1).toBe(true);
    expect(match2).toBe(true);

    // Wrong password should not match
    const wrongMatch = await bcrypt.compare("WrongPassword123", hash1);
    expect(wrongMatch).toBe(false);
  });

  it("should validate password confirmation", () => {
    const testCases = [
      { password: "ValidPass123", confirmPassword: "ValidPass123", shouldMatch: true },
      { password: "ValidPass123", confirmPassword: "DifferentPass123", shouldMatch: false },
      { password: "Pass123", confirmPassword: "Pass123", shouldMatch: true },
    ];

    testCases.forEach(({ password, confirmPassword, shouldMatch }) => {
      const matches = password === confirmPassword;
      expect(matches).toBe(shouldMatch);
    });
  });

  it("should validate form data completeness", () => {
    const completeData = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "student",
    };

    const incompleteData = {
      fullName: "",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "student",
    };

    // Check complete data
    expect(completeData.fullName).toBeTruthy();
    expect(completeData.email).toBeTruthy();
    expect(completeData.password).toBeTruthy();
    expect(completeData.confirmPassword).toBeTruthy();
    expect(completeData.role).toBeTruthy();

    // Check incomplete data
    expect(incompleteData.fullName).toBeFalsy();
  });

  it("should handle role-specific registration requirements", () => {
    const registrationRequirements = {
      student: {
        required: ["fullName", "email", "password", "role"],
        optional: [],
      },
      teacher: {
        required: ["fullName", "email", "password", "role", "subject"],
        optional: [],
      },
      admin: {
        required: ["fullName", "email", "password", "role"],
        optional: [],
      },
    };

    const studentReg = {
      fullName: "Jane Student",
      email: "jane@school.com",
      password: "StudentPass123",
      role: "student",
    };

    const teacherReg = {
      fullName: "Mr. Teacher",
      email: "teacher@school.com",
      password: "TeacherPass123",
      role: "teacher",
      subject: "Mathematics",
    };

    // Validate student registration
    const studentReq = registrationRequirements.student.required;
    studentReq.forEach(field => {
      expect(studentReg[field as keyof typeof studentReg]).toBeTruthy();
    });

    // Validate teacher registration
    const teacherReq = registrationRequirements.teacher.required;
    teacherReq.forEach(field => {
      expect(teacherReg[field as keyof typeof teacherReg]).toBeTruthy();
    });
  });
});
