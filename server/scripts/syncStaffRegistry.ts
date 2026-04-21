import { and, eq, inArray, isNotNull } from "drizzle-orm";
import * as db from "../db.js";
import { projects, teachers, users } from "../../drizzle/schema.js";
import { normalizePersonName, STAFF_REGISTRY } from "../staffRegistry.js";

const NON_SUPERVISOR_ADMIN_EMAILS = new Set([
  "afra.almarbouei@moe.sch.ae",
  "fatmia.alameri@moe.sch.ae",
  "badreyya-ma.alshehhi@moe.sch.ae",
]);

async function run() {
  const database = await db.getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  const canonicalByName = new Map<string, { id: number; email: string; role: "admin" | "teacher" | "public" }>();

  for (const entry of STAFF_REGISTRY) {
    const role = entry.role === "admin" ? "admin" : entry.role === "teacher" ? "teacher" : "public";
    const isNonSupervisorAdmin = role === "admin" && NON_SUPERVISOR_ADMIN_EMAILS.has(entry.email.toLowerCase());

    const ensured = await db.upsertUser({
      email: entry.email.toLowerCase(),
      name: entry.name,
      role,
      approved: role === "admin" || role === "teacher",
      loginMethod: "email",
    });

    if (!ensured) {
      continue;
    }

    canonicalByName.set(normalizePersonName(entry.name), {
      id: ensured.id,
      email: ensured.email,
      role,
    });

    const existingTeacherRow = await db.getTeacherByUserId(ensured.id);

    if (role === "teacher" || (role === "admin" && !isNonSupervisorAdmin)) {
      if (!existingTeacherRow) {
        await db.createTeacher({
          userId: ensured.id,
          department: "Project Supervisors",
          expertise: "[]",
          maxStudents: 20,
          currentStudents: 0,
        });
      }
    } else if (existingTeacherRow) {
      await database.delete(teachers).where(eq(teachers.userId, ensured.id));
    }
  }

  // Relink submitted projects to canonical supervisor accounts by current supervisor name.
  const projectRows = await database
    .select({
      projectId: projects.id,
      currentSupervisorId: projects.supervisorId,
      supervisorName: users.name,
      supervisorEmail: users.email,
    })
    .from(projects)
    .leftJoin(users, eq(projects.supervisorId, users.id))
    .where(isNotNull(projects.supervisorId));

  let relinked = 0;
  for (const row of projectRows) {
    const normalizedName = normalizePersonName(row.supervisorName ?? "");
    const canonical = canonicalByName.get(normalizedName);

    if (!canonical) {
      continue;
    }

    if (row.currentSupervisorId !== canonical.id) {
      await database
        .update(projects)
        .set({ supervisorId: canonical.id })
        .where(eq(projects.id, row.projectId));
      relinked += 1;
    }
  }

  // Keep only reviewers/admins in teachers table.
  const reviewerIds = Array.from(canonicalByName.values())
    .filter((x) => x.role === "teacher" || x.role === "admin")
    .map((x) => x.id);

  const teacherRows = await database.select({ userId: teachers.userId }).from(teachers);
  const toRemove = teacherRows
    .map((x) => x.userId)
    .filter((id) => !reviewerIds.includes(id));

  if (toRemove.length > 0) {
    await database.delete(teachers).where(inArray(teachers.userId, toRemove));
  }

  // For canonical emails, ensure role consistency even if users existed previously.
  const canonicalEmails = STAFF_REGISTRY.map((x) => x.email.toLowerCase());
  const canonicalUsers = await database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, canonicalEmails));

  for (const u of canonicalUsers) {
    const entry = STAFF_REGISTRY.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
    if (!entry) continue;

    const role = entry.role === "admin" ? "admin" : entry.role === "teacher" ? "teacher" : "public";
    await database
      .update(users)
      .set({
        role,
        name: entry.name,
        loginMethod: "email",
        approved: role === "admin" || role === "teacher",
      })
      .where(eq(users.id, u.id));
  }

  console.log(`[syncStaffRegistry] Synced ${STAFF_REGISTRY.length} registry entries.`);
  console.log(`[syncStaffRegistry] Relinked ${relinked} project supervisor references.`);
  console.log(`[syncStaffRegistry] Reviewer accounts active: ${reviewerIds.length}.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[syncStaffRegistry] Failed:", error);
    process.exit(1);
  });
