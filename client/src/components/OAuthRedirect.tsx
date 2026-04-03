import { useEffect } from "react";

/**
 * Keeps authenticated users on the home page.
 * Only clears the temporary selectedRole value after OAuth.
 */
export function OAuthRedirect() {
  useEffect(() => {
    localStorage.removeItem("selectedRole");
  }, []);

  return null;
}