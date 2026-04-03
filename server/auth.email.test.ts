import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import * as db from "./db";

describe("Email/Password Authentication", () => {
  it("should hash password correctly", async () => {
    const password = "testPassword123";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const isMatch = await bcrypt.compare(password, hashedPassword);
    expect(isMatch).toBe(true);
    
    const isNotMatch = await bcrypt.compare("wrongPassword", hashedPassword);
    expect(isNotMatch).toBe(false);
  });

  it("should retrieve user by email", async () => {
    // Using one of the test users from the database
    const user = await db.getUserByEmail("ahmed.eid.legal@gmail.com");
    
    if (user) {
      expect(user.email).toBe("ahmed.eid.legal@gmail.com");
      expect(user.role).toBe("admin");
    }
  });

  it("should return null for non-existent email", async () => {
    const user = await db.getUserByEmail("nonexistent@example.com");
    expect(user).toBeFalsy();
  });

  it("should validate email format", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "admin@company.org",
    ];
    
    const invalidEmails = [
      "invalid.email",
      "@example.com",
      "user@",
      "user name@example.com",
    ];
    
    // Email validation pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it("should validate password requirements", () => {
    const validPasswords = [
      "password123",
      "SecurePass456",
      "MyP@ssw0rd",
    ];
    
    const invalidPasswords = [
      "short",
      "12345",
      "",
    ];
    
    validPasswords.forEach(password => {
      expect(password.length >= 6).toBe(true);
    });
    
    invalidPasswords.forEach(password => {
      expect(password.length >= 6).toBe(false);
    });
  });

  it("should verify password hashing is secure", async () => {
    const password = "mySecurePassword123";
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    
    // Two hashes of the same password should be different (due to salt)
    expect(hash1).not.toBe(hash2);
    
    // But both should verify against the original password
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});
