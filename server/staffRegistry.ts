import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type StaffRole = "admin" | "teacher" | "visitor";

export type StaffRegistryEntry = {
  name: string;
  email: string;
  role: StaffRole;
};

// Canonical directory provided by school administration.
// Keep this list as the single source of truth for staff identity and role mapping.
const FALLBACK_STAFF_REGISTRY: StaffRegistryEntry[] = [
  { name: "Abeer M A Shalash", email: "abeer.alasy@moe.sch.ae", role: "teacher" },
  { name: "Afra Al Marbouei", email: "afra.almarbouei@moe.sch.ae", role: "admin" },
  { name: "Abir Abdel Fattah Ali Hegazy", email: "abir.hegazy@moe.sch.ae", role: "teacher" },
  { name: "Amna Hasan Abdulla Alshamsi", email: "amna-ha.alshamsi@moe.sch.ae", role: "teacher" },
  { name: "Amna Mustafa Abdulla Mustafa Alhashmi", email: "amna-ha.alhashmi@moe.sch.ae", role: "teacher" },
  { name: "Anoud Mousa Ibrahim Abdulla Alblooshi", email: "anoud.alblooshi@moe.sch.ae", role: "teacher" },
  { name: "Arti Thakur", email: "arti.thakur@moe.sch.ae", role: "admin" },
  { name: "Asmaa Abdulla Ibrahim Jasem Alhammadi", email: "asmaa.alhammadi@moe.sch.ae", role: "teacher" },
  { name: "Badreyy Al Shehhi", email: "badreyya-ma.alshehhi@moe.sch.ae", role: "admin" },
  { name: "Fatima Abdulla Salem Manea Alseiari", email: "fatima.alsayari@moe.sch.ae", role: "teacher" },
  { name: "Fatmia Al Ameri", email: "fatmia.alameri@moe.sch.ae", role: "admin" },
  { name: "Hanan Fawwaz Mahmoud Tayfour", email: "hanan.taifoor@moe.sch.ae", role: "teacher" },
  { name: "Holly Catherine Myburgh", email: "holly.myburgh@moe.sch.ae", role: "teacher" },
  { name: "Huda Hasan Mohamed Kamal Alali", email: "huda.alali@moe.sch.ae", role: "teacher" },
  { name: "Kholiwe Mangazha", email: "kholiwe.mangazha@moe.sch.ae", role: "teacher" },
  { name: "Liesil Elizabeth Williams", email: "liesil.williams@moe.sch.ae", role: "teacher" },
  { name: "Maryam Salem Farhan Alhammadi", email: "maryam-sf.alhammadi@moe.sch.ae", role: "teacher" },
  { name: "Muneera Mabkhot Saeed Al Kqahali", email: "muneera.alkqahali@moe.sch.ae", role: "teacher" },
  { name: "Neama Mohamed Ibrahim Elgamil", email: "nema.elgameil@moe.sch.ae", role: "teacher" },
  { name: "Nadya Mustafa Matawa", email: "nadya.matawa@moe.sch.ae", role: "teacher" },
  { name: "Naledi Noxolo Bhengu", email: "naledi.bhengu@moe.sch.ae", role: "teacher" },
  { name: "Norhan Khaled Marzouk Amin Elsayed", email: "norhan.elsayed@moe.sch.ae", role: "teacher" },
  { name: "Rasha Saleh Ahmed Hasan Almessabi", email: "rasha.almasaabi@moe.sch.ae", role: "teacher" },
  { name: "Reema Chhetri", email: "reema.chhetri@moe.sch.ae", role: "teacher" },
  { name: "Riham Saleh Elsaid Ahmed Hassan", email: "riham.hassan@moe.sch.ae", role: "admin" },
  { name: "Rosaila Abdel Hamid Hasan Souri", email: "rosaila.souri@moe.sch.ae", role: "teacher" },
  { name: "Sajida Bibi Younus", email: "sajida.younus@moe.sch.ae", role: "teacher" },
  { name: "Salha Sulaiman Sheikhmus", email: "salha.sheikhmus@moe.sch.ae", role: "teacher" },
  { name: "Salma Shahnawaz Shaikh", email: "salma.shaikh@moe.sch.ae", role: "admin" },
  { name: "Salsabeel Bassam Shehadeh Naser", email: "salsabeel.naser@moe.sch.ae", role: "teacher" },
  { name: "Sameya Hasan Omar", email: "sameya.omar@moe.sch.ae", role: "teacher" },
  { name: "Sumeera Nazir Ahmed Shuroo", email: "sumeera.nazir@moe.sch.ae", role: "teacher" },
  { name: "Yasmeen Omar Hussein Hamida", email: "yasmeen.hamida@moe.sch.ae", role: "teacher" },
  { name: "Zahinabath Sakeya Abdul Rahiman Sali", email: "zahinabath.sakeya@moe.sch.ae", role: "admin" },
];

function parseStaffRole(raw: string): StaffRole {
  const role = raw.trim().toLowerCase();
  if (role === "admin" || role === "teacher" || role === "visitor") {
    return role;
  }
  return "visitor";
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function loadStaffRegistryFromCsv(): StaffRegistryEntry[] {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const csvPath = path.join(currentDir, "data", "staff-registry.csv");

    if (!fs.existsSync(csvPath)) {
      return FALLBACK_STAFF_REGISTRY;
    }

    const csv = fs.readFileSync(csvPath, "utf8");
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= 1) {
      return FALLBACK_STAFF_REGISTRY;
    }

    const rows = lines.slice(1);
    const entries: StaffRegistryEntry[] = [];

    for (const row of rows) {
      const [name, email, roleRaw] = parseCsvLine(row);
      if (!name || !email || !roleRaw) {
        continue;
      }

      entries.push({
        name,
        email: email.toLowerCase(),
        role: parseStaffRole(roleRaw),
      });
    }

    return entries.length > 0 ? entries : FALLBACK_STAFF_REGISTRY;
  } catch (error) {
    console.warn("[staffRegistry] Failed to parse CSV, using fallback list.", error);
    return FALLBACK_STAFF_REGISTRY;
  }
}

export const STAFF_REGISTRY: StaffRegistryEntry[] = loadStaffRegistryFromCsv();

const STAFF_BY_EMAIL = new Map(
  STAFF_REGISTRY.map((entry) => [entry.email.toLowerCase(), entry])
);

export function getStaffRegistryEntryByEmail(email: string): StaffRegistryEntry | undefined {
  return STAFF_BY_EMAIL.get(email.toLowerCase());
}

export function normalizePersonName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
