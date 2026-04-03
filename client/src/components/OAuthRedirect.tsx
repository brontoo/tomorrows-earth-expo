import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Component that handles role-based redirect after OAuth callback.
 * This is rendered on the home page after OAuth completes.
 * It checks localStorage for the selected role and redirects to the appropriate dashboard.
 */
export function OAuthRedirect() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Get the role that was stored in localStorage before OAuth
    const selectedRole = localStorage.getItem("selectedRole");

    // Determine redirect path based on role
    let redirectPath = "/";
    if (selectedRole === "student") {
      redirectPath = "/student/dashboard";
    } else if (selectedRole === "teacher") {
      redirectPath = "/teacher/dashboard";
    } else if (selectedRole === "admin" || user.role === "admin") {
      redirectPath = "/admin/dashboard";
    } else if (user.role === "teacher") {
      redirectPath = "/teacher/dashboard";
    } else if (user.role === "student") {
      redirectPath = "/student/dashboard";
    }

    // Clear the stored role
    localStorage.removeItem("selectedRole");

    // Redirect to appropriate dashboard
    if (redirectPath !== "/") {
      setLocation(redirectPath);
    }
  }, [user, isAuthenticated, setLocation]);

  return null;
}
