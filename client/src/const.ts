export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime. Route users to the role chooser first.
export const getLoginUrl = () => {
  return "/choose-role";
};

// Generate login URL with a requested role. Route users to the chooser.
export const getLoginUrlWithRole = (role: "student" | "teacher" | "admin") => {
  return "/choose-role";
};
