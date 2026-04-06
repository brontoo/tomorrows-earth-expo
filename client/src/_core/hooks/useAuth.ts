import { useEffect, useMemo, useState, useCallback } from "react"
import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";

// ─── الـ roles المسموح بها من قاعدة البيانات فقط ──────────────────────────────
// لا يمكن لأي مستخدم اختيار role بنفسه — يُقرأ دائماً من جدول users في Supabase
const VALID_ROLES = ["student", "teacher", "admin"] as const;
type UserRole = typeof VALID_ROLES[number];

type AuthUser = {
  id: string | number;
  email: string;
  role: UserRole;
  name: string;
  grade?: string;
  schoolClass?: string;
  openId?: string;
};

// ─── جلب الـ role الحقيقي من قاعدة البيانات ──────────────────────────────────
async function fetchRoleFromDB(supabaseUserId: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("open_id", supabaseUserId)  // ← تأكد من اسم العمود الصحيح عندك
      .single();

    if (error || !data?.role) {
      console.warn("[Auth] Could not fetch role from DB, defaulting to student:", error?.message);
      return "student"; // Default آمن
    }

    // تحقق إضافي أن الـ role قيمة صحيحة
    const role = data.role as string;
    if (!VALID_ROLES.includes(role as UserRole)) {
      console.warn("[Auth] Invalid role from DB:", role, "— defaulting to student");
      return "student";
    }

    return role as UserRole;
  } catch {
    return "student";
  }
}

export function useAuth(options?: any) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── بناء بيانات المستخدم من Session + Role من DB ─────────────────────────
  const buildUserFromSession = useCallback(async (session: any): Promise<AuthUser> => {
    const supabaseId = session.user.id;

    // ✅ الـ role يأتي من DB فقط — ليس من localStorage أو user input
    const role = await fetchRoleFromDB(supabaseId);

    return {
      id: supabaseId,
      email: session.user.email!,
      name: session.user.user_metadata?.full_name
        || session.user.email?.split("@")[0]
        || "User",
      role,
      openId: supabaseId,
    };
  }, []);

  // ─── تهيئة الـ Auth ───────────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        // جلب الـ Session من Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // ✅ بناء المستخدم من DB — لا نثق بأي قيمة محلية للـ role
          const authUser = await buildUserFromSession(session);
          // حفظ في localStorage للأداء (قراءة سريعة) لكن بدون role قابل للتلاعب
          localStorage.setItem("auth-user-cache", JSON.stringify(authUser));
          setUser(authUser);
          return;
        }

        // لا يوجد session — مستخدم غير مسجل
        localStorage.removeItem("auth-user-cache");
        setUser(null);

      } catch (error) {
        console.warn("[Auth] Auth init error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // مراقبة تغييرات الـ session (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] Auth state changed:", event);

        if (event === "SIGNED_IN" && session) {
          const authUser = await buildUserFromSession(session);
          localStorage.setItem("auth-user-cache", JSON.stringify(authUser));
          setUser(authUser);
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("auth-user-cache");
          localStorage.removeItem("selectedRole"); // تنظيف أي بقايا
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [buildUserFromSession]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    localStorage.removeItem("auth-user-cache");
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  // ─── Refresh (إعادة جلب الـ role من DB) ──────────────────────────────────
  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const authUser = await buildUserFromSession(session);
      localStorage.setItem("auth-user-cache", JSON.stringify(authUser));
      setUser(authUser);
    }
  }, [buildUserFromSession]);

  // ─── loginMock للتطوير فقط ────────────────────────────────────────────────
  // ⚠️ هذا للـ development فقط — احذفه في الـ production
  const loginMock = useCallback(async (role: UserRole) => {
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] loginMock is disabled in production!");
      return;
    }
    const mockUser: AuthUser = {
      id: "dev-mock-id",
      email: "demo@tomorrowsearth.ae",
      role,
      name: "Demo " + role.charAt(0).toUpperCase() + role.slice(1),
    };
    localStorage.setItem("auth-user-cache", JSON.stringify(mockUser));
    setUser(mockUser);
    setTimeout(() => { window.location.href = "/"; }, 100);
  }, []);

  const state = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    error: null,
  }), [user, loading]);

  return {
    ...state,
    refresh,
    logout,
    loginMock,
  };
}