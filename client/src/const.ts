export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime. Now points to local /login.
export const getLoginUrl = () => {
  return "/login";
};

// Generate login URL. Now points to local /login.
export const getLoginUrlWithRole = (role: "student" | "teacher" | "admin") => {
  return "/login";
};
