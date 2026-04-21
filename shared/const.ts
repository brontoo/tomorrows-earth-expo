export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// Timeline dates for Tomorrow's Earth Expo 2026
export const EXPO_DATE = new Date("2026-05-20T00:00:00Z");
export const REGISTRATION_START = new Date("2026-02-01T00:00:00Z");
export const ABSTRACT_APPROVAL_START = new Date("2026-02-01T00:00:00Z");
export const ABSTRACT_APPROVAL_END = new Date("2026-03-31T23:59:59Z");
export const MEDIA_UPLOAD_START = new Date("2026-03-01T00:00:00Z");
export const MEDIA_UPLOAD_END = new Date("2026-05-05T23:59:59Z");
export const SUBMISSION_DEADLINE = new Date("2026-05-05T23:59:59Z");
export const ADMIN_EDIT_START = new Date("2026-05-05T00:00:00Z");
export const ADMIN_EDIT_END = new Date("2026-05-15T23:59:59Z");

// Category themes
export const CATEGORY_THEMES = {
  "sustainable-architecture": {
    name: "Sustainable Architecture & Geology",
    colors: {
      primary: "oklch(0.65 0.15 60)",
      secondary: "oklch(0.75 0.10 70)",
      accent: "oklch(0.55 0.20 50)",
    },
  },
  "renewable-energy": {
    name: "Renewable Energy & Robotics",
    colors: {
      primary: "oklch(0.60 0.20 240)",
      secondary: "oklch(0.85 0.15 90)",
      accent: "oklch(0.50 0.25 250)",
    },
  },
  "biodiversity": {
    name: "Biodiversity & Bio-Tech",
    colors: {
      primary: "oklch(0.65 0.20 140)",
      secondary: "oklch(0.75 0.15 150)",
      accent: "oklch(0.55 0.25 130)",
    },
  },
  "climate-tech": {
    name: "Climate Tech & AI Solutions",
    colors: {
      primary: "oklch(0.70 0.15 200)",
      secondary: "oklch(0.95 0.02 200)",
      accent: "oklch(0.60 0.20 190)",
    },
  },
} as const;

// Phase status
export enum ExpoPhase {
  PRE_REGISTRATION = "pre_registration",
  REGISTRATION_OPEN = "registration_open",
  ABSTRACT_APPROVAL = "abstract_approval",
  MEDIA_UPLOAD = "media_upload",
  SUBMISSIONS_LOCKED = "submissions_locked",
  ADMIN_EDIT = "admin_edit",
  EXPO_DAY = "expo_day",
  POST_EXPO = "post_expo",
}

// Helper function to get current phase
export function getCurrentPhase(): ExpoPhase {
  const now = new Date();
  
  if (now < REGISTRATION_START) {
    return ExpoPhase.PRE_REGISTRATION;
  } else if (now >= REGISTRATION_START && now < ABSTRACT_APPROVAL_END) {
    return ExpoPhase.REGISTRATION_OPEN;
  } else if (now >= ABSTRACT_APPROVAL_START && now < ABSTRACT_APPROVAL_END) {
    return ExpoPhase.ABSTRACT_APPROVAL;
  } else if (now >= MEDIA_UPLOAD_START && now < SUBMISSION_DEADLINE) {
    return ExpoPhase.MEDIA_UPLOAD;
  } else if (now >= SUBMISSION_DEADLINE && now < ADMIN_EDIT_START) {
    return ExpoPhase.SUBMISSIONS_LOCKED;
  } else if (now >= ADMIN_EDIT_START && now < ADMIN_EDIT_END) {
    return ExpoPhase.ADMIN_EDIT;
  } else if (now >= EXPO_DATE && now < new Date(EXPO_DATE.getTime() + 24 * 60 * 60 * 1000)) {
    return ExpoPhase.EXPO_DAY;
  } else {
    return ExpoPhase.POST_EXPO;
  }
}

// Check if submissions are allowed
export function canSubmitProjects(): boolean {
  const phase = getCurrentPhase();
  return [
    ExpoPhase.REGISTRATION_OPEN,
    ExpoPhase.ABSTRACT_APPROVAL,
    ExpoPhase.MEDIA_UPLOAD,
  ].includes(phase);
}

// Check if media uploads are allowed
export function canUploadMedia(): boolean {
  const phase = getCurrentPhase();
  return phase === ExpoPhase.MEDIA_UPLOAD;
}

// Check if admin can edit
export function isAdminEditPhase(): boolean {
  const phase = getCurrentPhase();
  return phase === ExpoPhase.ADMIN_EDIT;
}

// Check if it's Expo Day
export function isExpoDay(): boolean {
  const phase = getCurrentPhase();
  return phase === ExpoPhase.EXPO_DAY;
}
