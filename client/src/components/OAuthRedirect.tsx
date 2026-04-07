import { useEffect } from "react";

/**
 * Keeps authenticated users on the home page.
 * Clears the temporary requestedRole value after OAuth.
 */
export function OAuthRedirect() {
  useEffect(() => {
    localStorage.removeItem("requestedRole");
  }, []);

  return null;
}
