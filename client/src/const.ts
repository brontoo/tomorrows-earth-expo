export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime. Route users to the login page first.
export const getLoginUrl = () => {
  return "/login";
};

// Generate login URL with a requested role. Route users to the login page.
export const getLoginUrlWithRole = (role: "student" | "teacher" | "admin") => {
  return "/login";
};
