import { useEffect, useMemo, useState, useCallback } from "react";
import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";

// --- Types -------------------------------------------------------------------
const VALID_ROLES = ["student", "teacher", "admin", "visitor"] as const;
export type UserRole = typeof VALID_ROLES[number];

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  grade?: string;
  schoolClass?: string;
  openId?: string;
  loginMethod?: string;
};

const normalizeRole = (role: unknown): UserRole | null => {
  if (typeof role !== "string") return null;
  const normalized = role.toLowerCase() as UserRole;
  return VALID_ROLES.includes(normalized) ? normalized : null;
};

const isValidRole = (role: unknown): role is UserRole => normalizeRole(role) !== null;

// --- Role detection ----------------------------------------------------------
// Try user metadata first, then fall back to Supabase role tables if they exist.
export async function detectRoleFromDB(
  email: string,
  supabaseUid: string,
  metadataRole?: unknown
): Promise<UserRole> {
  const normalizedMetadataRole = normalizeRole(metadataRole);
  if (normalizedMetadataRole) {
    return normalizedMetadataRole;
  }

  try {
    const withTimeout = <T>(p: PromiseLike<T>, ms = 6000) =>
      Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
      ]) as Promise<T>;

    const adminRes = await withTimeout(
      supabase.from("admins").select("email").eq("email", email).maybeSingle()
    );
    if (adminRes?.data) return "admin";

    const teacherRes = await withTimeout(
      supabase.from("approved_teachers").select("email").eq("email", email).maybeSingle()
    );
    if (teacherRes?.data) return "teacher";

    const projectRes = await withTimeout(
      supabase.from("projects").select("id").eq("created_by", supabaseUid).limit(1).maybeSingle()
    );
    if (projectRes?.data) return "student";

    return "visitor";
  } catch (err) {
    console.warn("[Auth] Could not detect role from DB:", err);
    return "visitor";
  }
}

// --- useAuth -----------------------------------------------------------------
export function useAuth(options?: any) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath = getLoginUrl(),
  } = options ?? {};

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUser = useCallback(async (session: any): Promise<AuthUser> => {
    const supabaseUid = session.user.id as string;
    const email = (session.user.email ?? "") as string;
    const metadataRole = session.user.user_metadata?.role;
    const role = await detectRoleFromDB(email, supabaseUid, metadataRole);

    return {
      id: supabaseUid,
      openId: supabaseUid,
      email,
      name: session.user.user_metadata?.full_name ?? email.split("@")[0] ?? "User",
      role,
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const authUser = await buildUser(session);
          localStorage.setItem("mock-user", JSON.stringify(authUser));
          setUser(authUser);
        } else {
          const cached = localStorage.getItem("mock-user");
          if (cached) {
            try { setUser(JSON.parse(cached)); } catch { }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("[Auth] Init error:", err);
        const cached = localStorage.getItem("mock-user");
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch { }
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const authUser = await buildUser(session);
          localStorage.setItem("mock-user", JSON.stringify(authUser));
          setUser(authUser);
          setLoading(false);

          if (authUser.role === "visitor") {
            window.location.href = "/choose-role";
          }
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("mock-user");
          localStorage.removeItem("requestedRole");
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [buildUser]);

  useEffect(() => {
    if (!loading && !user && redirectOnUnauthenticated) {
      if (window.location.pathname !== redirectPath) {
        window.location.href = redirectPath;
      }
    }
  }, [loading, user, redirectOnUnauthenticated, redirectPath]);

  const logout = useCallback(async () => {
    localStorage.removeItem("mock-user");
    localStorage.removeItem("requestedRole");
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const authUser = await buildUser(session);
      localStorage.setItem("mock-user", JSON.stringify(authUser));
      setUser(authUser);
    }
  }, [buildUser]);

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
