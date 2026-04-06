import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for role-based access control.
 */
export const userRoleEnum = pgEnum("user_role", ["admin", "teacher", "student", "public"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("open_id", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }), // For email/password authentication
  loginMethod: varchar("login_method", { length: 64 }), // 'email', 'google', 'oauth'
  role: userRoleEnum("role").default("public").notNull(),
  grade: varchar("grade", { length: 20 }), // For students
  schoolClass: varchar("school_class", { length: 100 }), // For students and teachers
  approved: boolean("approved").default(false).notNull(), // For teacher approval
  passwordResetToken: varchar("password_reset_token", { length: 255 }), // For password reset
  passwordResetExpires: timestamp("password_reset_expires"), // Expiration time for reset token
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationExpires: timestamp("verification_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories for innovation projects
 */
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  colorTheme: varchar("color_theme", { length: 50 }).notNull(), // e.g., "earth-brown", "electric-blue"
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Subcategories within main categories
 */
export const subcategories = pgTable("subcategories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id").notNull(), // Reference to main category
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = typeof subcategories.$inferInsert;

/**
 * Student project submissions
 */
export const projectStatusEnum = pgEnum("project_status", ["draft", "submitted", "approved", "rejected", "finalist"]);

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 500 }).notNull(),
  teamName: varchar("team_name", { length: 255 }).notNull(),
  categoryId: integer("category_id").notNull(),
  
  // Team members (student user IDs)
  createdBy: integer("created_by").notNull(), // Team leader
  teamMemberIds: text("team_member_ids"), // JSON array of user IDs
  
  // Project content
  abstract: text("abstract"),
  description: text("description"), // Project description
  scientificQuestion: text("scientific_question"),
  sdgAlignment: text("sdg_alignment"), // JSON array of SDG numbers
  researchMethod: text("research_method"),
  experimentDetails: text("experiment_details"),
  dataExplanation: text("data_explanation"),
  
  // Media
  thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
  imageUrls: text("image_urls"), // JSON array of URLs
  videoUrl: varchar("video_url", { length: 1000 }),
  model3dUrl: varchar("model3d_url", { length: 1000 }),
  documentUrls: text("document_urls"), // JSON array of document URLs
  
  // Metadata
  grade: varchar("grade", { length: 20 }).notNull(),
  status: projectStatusEnum("status").default("draft").notNull(),
  qrCode: varchar("qr_code", { length: 1000 }), // Generated QR code URL
  
  // Subcategory and supervisor
  subcategoryId: integer("subcategory_id"), // Reference to selected subcategory
  supervisorId: integer("supervisor_id"), // Assigned teacher supervisor
  
  // Approval workflow
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by"), // Teacher user ID
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Journey blog posts - weekly updates from student teams
 */
export const journeyPosts = pgTable("journey_posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  imageUrls: text("image_urls"), // JSON array of URLs
  videoUrl: varchar("video_url", { length: 1000 }),
  weekNumber: integer("week_number"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JourneyPost = typeof journeyPosts.$inferSelect;
export type InsertJourneyPost = typeof journeyPosts.$inferInsert;

/**
 * Comments from teachers on projects
 */
export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(), // Only visible to team and teachers
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * People's Choice voting
 */
export const votes = pgTable("votes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  voterIdentifier: varchar("voter_identifier", { length: 255 }).notNull(), // IP or session ID for anonymous voting
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

/**
 * System configuration for timeline phases and settings
 */
export const systemConfig = pgTable("system_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Resources and guidelines content
 */
export const resourceTypeEnum = pgEnum("resource_type", ["toolkit", "rubric", "faq", "guide"]);

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull(),
  fileUrl: varchar("file_url", { length: 1000 }),
  content: text("content"), // For FAQ and guides
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/**
 * Notification queue for email alerts
 */
export const notificationTypeEnum = pgEnum("notification_type", ["project_submitted", "project_approved", "project_rejected", "deadline_reminder", "system_alert"]);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  relatedProjectId: integer("related_project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Teacher information and availability
 */
export const teachers = pgTable("teachers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(), // Reference to user table
  department: varchar("department", { length: 255 }),
  expertise: text("expertise"), // JSON array of expertise areas
  maxStudents: integer("max_students").default(10).notNull(), // Maximum projects they can supervise
  currentStudents: integer("current_students").default(0).notNull(), // Current number of supervised projects
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;


/**
 * Student Assignment System
 * Tracks which teacher and category each student is assigned to
 */
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "unlocked", "reset"]);

export const assignments = pgTable("assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer("student_id").notNull().unique(), // One assignment per student
  teacherName: varchar("teacher_name", { length: 255 }).notNull(), // Hardcoded teacher name from list
  mainCategoryId: integer("main_category_id").notNull(), // Reference to categories table
  subcategoryId: integer("subcategory_id").notNull(), // Reference to subcategories table
  status: assignmentStatusEnum("status").default("assigned").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;


/**
 * Project Feedback and Review System
 * Teachers leave feedback on student projects
 */
export const feedbackStatusEnum = pgEnum("feedback_status", ["draft", "sent", "acknowledged"]);

export const projectFeedback = pgTable("project_feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  feedbackText: text("feedback_text"),
  inlineComments: text("inline_comments"), // JSON array of inline comments
  score: integer("score"), // Overall score (0-100)
  status: feedbackStatusEnum("status").default("draft").notNull(),
  needsRevision: boolean("needs_revision").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProjectFeedback = typeof projectFeedback.$inferSelect;
export type InsertProjectFeedback = typeof projectFeedback.$inferInsert;

/**
 * Grading Rubrics
 * Define criteria for evaluating student projects
 */
export const rubrics = pgTable("rubrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teacherId: integer("teacher_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  criteria: text("criteria"), // JSON array of rubric criteria
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Rubric = typeof rubrics.$inferSelect;
export type InsertRubric = typeof rubrics.$inferInsert;

/**
 * Rubric Scores
 * Track scores for each rubric criterion per project
 */
export const rubricScores = pgTable("rubric_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  feedbackId: integer("feedback_id").notNull(),
  rubricId: integer("rubric_id").notNull(),
  criterionId: varchar("criterion_id", { length: 255 }).notNull(),
  score: integer("score").notNull(), // Score for this criterion
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RubricScore = typeof rubricScores.$inferSelect;
export type InsertRubricScore = typeof rubricScores.$inferInsert;

/**
 * Teacher-Student Messaging
 * Direct communication between teachers and students
 */
export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  projectId: integer("project_id"), // Optional: related project
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  attachmentUrls: text("attachment_urls"), // JSON array of attachment URLs
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Teacher Analytics and Tracking
 * Track teacher activity and project review metrics
 */
export const teacherAnalytics = pgTable("teacher_analytics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teacherId: integer("teacher_id").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  projectsReviewed: integer("projects_reviewed").default(0).notNull(),
  feedbackSent: integer("feedback_sent").default(0).notNull(),
  averageReviewTime: integer("average_review_time").default(0).notNull(), // in minutes
  messagesSent: integer("messages_sent").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TeacherAnalytics = typeof teacherAnalytics.$inferSelect;
export type InsertTeacherAnalytics = typeof teacherAnalytics.$inferInsert;

/**
 * Submission History
 * Track all changes and revisions to project submissions
 */
export const submissionHistory = pgTable("submission_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // 'submitted', 'revised', 'approved', 'rejected'
  changedBy: integer("changed_by").notNull(), // User ID who made the change
  notes: text("notes"),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubmissionHistory = typeof submissionHistory.$inferSelect;
export type InsertSubmissionHistory = typeof submissionHistory.$inferInsert;
