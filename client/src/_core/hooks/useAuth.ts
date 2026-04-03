import { useEffect, useMemo, useState, useCallback } from "react"
import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";

export function useAuth(options?: any) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};

  type MockUserType = { id: number; email: string; role: string; name: string; grade?: string; schoolClass?: string; loginMethod?: string; openId?: string };

  const [user, setUser] = useState<MockUserType | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ قراءة Supabase session + hash token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1️⃣ قراءة hash token من Supabase OAuth
        const hash = window.location.hash;
        if (hash) {
          console.log("[Auth] OAuth hash detected:", hash.substring(0, 50) + "...");

          // Supabase يتعامل مع hash تلقائياً، لكن نأكد
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[Auth] Supabase session active:", session.user.email);
            localStorage.setItem("mock-user", JSON.stringify({
              id: parseInt(session.user.id),
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
              role: (localStorage.getItem("selectedRole") as any) || "student",
              openId: session.user.id
            }));
            setUser(JSON.parse(localStorage.getItem("mock-user")!));
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }

        // 2️⃣ Mock user من localStorage
        const savedUser = localStorage.getItem("mock-user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          return;
        }

        // 3️⃣ Supabase session عادي (غير OAuth)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem("mock-user", JSON.stringify({
            id: parseInt(session.user.id),
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
            role: (localStorage.getItem("selectedRole") as any) || "student",
            openId: session.user.id
          }));
          setUser(JSON.parse(localStorage.getItem("mock-user")!));
          return;
        }
      } catch (error) {
        console.warn("[Auth] Auth init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginMock = useCallback(async (role: "student" | "teacher" | "admin") => {
    const mockUser = {
      id: 1,
      email: "demo@tomorrowsearth.ae",
      role: role,
      name: "Demo " + role.charAt(0).toUpperCase() + role.slice(1)
    };
    localStorage.setItem("mock-user", JSON.stringify(mockUser));
    localStorage.setItem("selectedRole", role);
    setUser(mockUser);

    setTimeout(() => {
      window.location.href = "/";  // ← الصفحة الرئيسية
    }, 100);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("mock-user");
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  const state = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    error: null,
  }), [user, loading]);

  return {
    ...state,
    refresh: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem("mock-user", JSON.stringify({
          id: parseInt(session.user.id),
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
          role: (localStorage.getItem("selectedRole") as any) || "student",
          openId: session.user.id
        }));
        setUser(JSON.parse(localStorage.getItem("mock-user")!));
      }
    },
    logout,
    loginMock,
  }
}