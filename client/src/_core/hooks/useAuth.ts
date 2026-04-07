import { useEffect, useMemo, useState, useCallback } from "react"
import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
const VALID_ROLES = ["student", "teacher", "admin", "visitor"] as const;
type UserRole = typeof VALID_ROLES[number];

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  grade?: string;
  schoolClass?: string;
  openId?: string;
};

// ─── Role detection — من جداول DB مباشرة ────────────────────────────────────
// الأولوية: admins → approved_teachers → projects (طالب سبق وسجّل) → visitor
async function detectRoleFromDB(
  email: string,
  supabaseUid: string
): Promise<UserRole> {
  try {
    // helper: race any promise against a timeout
    const withTimeout = (p: Promise<any>, ms = 6000) =>
      Promise.race([
        p,
        new Promise<any>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
      ]);

    // 1. هل هو Admin؟
    const adminRes = await withTimeout(
      supabase.from("admins").select("email").eq("email", email).maybeSingle().then(r => r)
    );
    if (adminRes?.data) return "admin";

    // 2. هل هو معلم معتمد؟
    const teacherRes = await withTimeout(
      supabase.from("approved_teachers").select("email").eq("email", email).maybeSingle().then(r => r)
    );
    if (teacherRes?.data) return "teacher";

    // 3. هل سبق وسجّل مشروعاً كطالب؟
    const projectRes = await withTimeout(
      supabase.from("projects").select("id").eq("supabase_uid", supabaseUid).limit(1).maybeSingle().then(r => r)
    );
    if (projectRes?.data) return "student";

    // 4. غير معروف — visitor
    return "visitor";

  } catch (err) {
    console.warn("[Auth] Could not detect role from DB:", err);
    return "visitor";
  }
}

// ─── useAuth ─────────────────────────────────────────────────────────────────
export function useAuth(options?: any) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath = getLoginUrl(),
  } = options ?? {};

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── بناء AuthUser من session ──────────────────────────────────────────────
  const buildUser = useCallback(async (session: any): Promise<AuthUser> => {
    const supabaseUid = session.user.id as string;
    const email = (session.user.email ?? "") as string;

    // جلب الدور من DB
    const role = await detectRoleFromDB(email, supabaseUid);

    return {
      id: supabaseUid,
      openId: supabaseUid,
      email,
      name: session.user.user_metadata?.full_name
        ?? email.split("@")[0]
        ?? "User",
      role,
    };
  }, []);

  // ── تهيئة عند تحميل الصفحة ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const authUser = await buildUser(session);
          // حفظ في localStorage كـ mock-user للتوافق مع باقي الكود
          localStorage.setItem("mock-user", JSON.stringify(authUser));
          setUser(authUser);
        } else {
          // لا session → نحاول نقرأ من localStorage كـ fallback
          const cached = localStorage.getItem("mock-user");
          if (cached) {
            try { setUser(JSON.parse(cached)); } catch { }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("[Auth] Init error:", err);
        // fallback للـ localStorage
        const cached = localStorage.getItem("mock-user");
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch { }
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    // مراقبة تغييرات الـ session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const authUser = await buildUser(session);
          localStorage.setItem("mock-user", JSON.stringify(authUser));
          setUser(authUser);
          setLoading(false);

          // إذا كان visitor → وجّهه لصفحة اختيار الدور
          if (authUser.role === "visitor") {
            window.location.href = "/choose-role";
          }

        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("mock-user");
          localStorage.removeItem("selectedRole");
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [buildUser]);

  // ── Redirect if unauthenticated ───────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user && redirectOnUnauthenticated) {
      if (window.location.pathname !== redirectPath) {
        window.location.href = redirectPath;
      }
    }
  }, [loading, user, redirectOnUnauthenticated, redirectPath]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    localStorage.removeItem("mock-user");
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  // ── Refresh (إعادة جلب الدور من DB) ──────────────────────────────────────
  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const authUser = await buildUser(session);
      localStorage.setItem("mock-user", JSON.stringify(authUser));
      setUser(authUser);
    }
  }, [buildUser]);

  // ── loginMock — development only ─────────────────────────────────────────
  const loginMock = useCallback(async (role: UserRole) => {
    if (import.meta.env.PROD) {
      console.error("[Auth] loginMock is disabled in production!");
      return;
    }
    const mockUser: AuthUser = {
      id: "dev-mock-id",
      email: "demo@tomorrowsearth.ae",
      role,
      name: "Demo " + role.charAt(0).toUpperCase() + role.slice(1),
    };
    localStorage.setItem("mock-user", JSON.stringify(mockUser));
    setUser(mockUser);
    setTimeout(() => { window.location.href = "/"; }, 100);
  }, []);

  const state = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    error: null,
  }), [user, loading]);

  return { ...state, refresh, logout, loginMock };
}