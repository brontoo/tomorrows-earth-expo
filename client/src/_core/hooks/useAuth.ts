import { useEffect, useMemo, useState, useCallback } from "react"
import { getLoginUrl } from "@/const";

// Mock Auth لـ Vercel Static (بدون backend)
export function useAuth(options?: any) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};
  type MockUserType = { id: number; email: string; role: string; name: string; grade?: string; schoolClass?: string; loginMethod?: string; openId?: string };
  const [user, setUser] = useState<MockUserType | null>(() => {
    // Check local storage synchronously to avoid flashing
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("mock-user");
      if (savedUser) return JSON.parse(savedUser);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user && redirectOnUnauthenticated) {
      if (typeof window !== "undefined" && window.location.pathname !== redirectPath) {
        window.location.href = redirectPath;
      }
    }
  }, [loading, user, redirectOnUnauthenticated, redirectPath]);

  const loginMock = useCallback(async (role: "student" | "teacher" | "admin") => {
    const mockUser = {
      id: 1,
      email: "demo@tomorrowsearth.ae",
      role: role,
      name: "Demo " + role.charAt(0).toUpperCase() + role.slice(1)
    };
    localStorage.setItem("mock-user", JSON.stringify(mockUser));
    setUser(mockUser);
    
    setTimeout(() => {
      window.location.href = `/${role}/dashboard`;
    }, 100);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("mock-user");
    setUser(null);
    window.location.href = "/";
  }, []);

  const state = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    error: null,
  }), [user, loading])

  return {
    ...state,
    refresh: () => { },
    logout,
    loginMock,
  }
}