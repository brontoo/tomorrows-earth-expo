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

type SyncedBackendUser = {
  id: number;
  email: string;
  role: UserRole;
  name: string;
};

async function syncBackendSession(user: AuthUser): Promise<SyncedBackendUser | null> {
  const payloadRole = user.role === "visitor" ? undefined : user.role;

  const response = await fetch("/api/trpc/auth.syncUser?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      0: {
        json: {
          email: user.email,
          name: user.name,
          openId: user.openId ?? user.id,
          role: payloadRole,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `syncUser failed with status ${response.status}`);
  }

  try {
    const payload = await response.json();
    const synced = payload?.[0]?.result?.data?.json?.user;
    if (!synced) return null;

    const normalizedRole = normalizeRole(synced.role);
    if (!normalizedRole) return null;

    return {
      id: synced.id,
      email: String(synced.email ?? user.email),
      name: String(synced.name ?? user.name),
      role: normalizedRole,
    };
  } catch {
    return null;
  }
}

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

// --- Server session check (JWT cookie, no Supabase) --------------------------
async function getServerSessionUser(): Promise<AuthUser | null> {
  try {
    const url = `/api/trpc/auth.me?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return null;
    const payload = await response.json();
    const serverUser = payload?.[0]?.result?.data?.json;
    if (!serverUser?.email) return null;
    const role = normalizeRole(serverUser.role);
    if (!role) return null;
    return {
      id: String(serverUser.id || ""),
      email: serverUser.email,
      name: serverUser.name || serverUser.email.split("@")[0] || "User",
      role,
      openId: serverUser.openId || `email:${serverUser.email.toLowerCase()}`,
    };
  } catch {
    return null;
  }
}

// --- useAuth -----------------------------------------------------------------
export function useAuth(options?: any) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath = getLoginUrl(),
  } = options ?? {};

  const [user, setUser] = useState<AuthUser | null>(() => {
    // Optimistic: load cached user immediately to avoid blank UI on init
    try {
      const cached = localStorage.getItem("mock-user");
      if (cached) return JSON.parse(cached) as AuthUser;
    } catch {}
    return null;
  });
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
    let subscription: any = null;
    let isMounted = true;

    const init = async () => {
      if (!isMounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          const authUser = await buildUser(session);
          if (!isMounted) return;

          let finalUser = authUser;
          try {
            const synced = await syncBackendSession(authUser);
            if (synced && isMounted) {
              finalUser = {
                ...authUser,
                email: synced.email,
                name: synced.name,
                role: synced.role,
              };
            }
          } catch (syncErr) {
            console.warn("[Auth] Failed to sync backend session on init:", syncErr);
          }
          if (isMounted) {
            localStorage.setItem("mock-user", JSON.stringify(finalUser));
            setUser(finalUser);
          }
        } else {
          // No Supabase session — check the JWT cookie set by loginWithEmail/syncUser
          const serverUser = await getServerSessionUser();
          if (!isMounted) return;

          if (serverUser) {
            localStorage.setItem("mock-user", JSON.stringify(serverUser));
            setUser(serverUser);
          } else {
            localStorage.removeItem("mock-user");
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("[Auth] Init error:", err);
        if (!isMounted) return;

        // On error, fall back to server session before giving up
        try {
          const serverUser = await getServerSessionUser();
          if (serverUser && isMounted) {
            localStorage.setItem("mock-user", JSON.stringify(serverUser));
            setUser(serverUser);
            return;
          }
        } catch { /* ignore */ }
        if (!import.meta.env.PROD && isMounted) {
          const cached = localStorage.getItem("mock-user");
          if (cached) {
            try { setUser(JSON.parse(cached)); } catch { }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    try {
      const authStateChangeResult = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;

          if (event === "SIGNED_IN" && session) {
            const authUser = await buildUser(session);
            if (!isMounted) return;

            let finalUser = authUser;
            try {
              const synced = await syncBackendSession(authUser);
              if (synced && isMounted) {
                finalUser = {
                  ...authUser,
                  email: synced.email,
                  name: synced.name,
                  role: synced.role,
                };
              }
            } catch (syncErr) {
              console.warn("[Auth] Failed to sync backend session on sign-in:", syncErr);
            }
            if (isMounted) {
              localStorage.setItem("mock-user", JSON.stringify(finalUser));
              setUser(finalUser);
              setLoading(false);
            }
          } else if (event === "SIGNED_OUT") {
            if (isMounted) {
              localStorage.removeItem("mock-user");
              localStorage.removeItem("requestedRole");
              setUser(null);
              setLoading(false);
            }
          }
        }
      );

      // Handle both direct unsubscriber and { data: { subscription } } formats
      subscription =
        authStateChangeResult?.data?.subscription || authStateChangeResult;
    } catch (err) {
      console.warn("[Auth] Error setting up auth state change listener:", err);
    }

    return () => {
      isMounted = false;
      try {
        if (subscription && typeof subscription.unsubscribe === "function") {
          subscription.unsubscribe();
        }
      } catch (err) {
        console.warn("[Auth] Error unsubscribing from auth state change:", err);
      }
    };
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
    // Clear server-side JWT cookie
    await fetch("/api/trpc/auth.logout?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ "0": { json: {} } }),
    }).catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const authUser = await buildUser(session);
      let finalUser = authUser;
      try {
        const synced = await syncBackendSession(authUser);
        if (synced) {
          finalUser = {
            ...authUser,
            email: synced.email,
            name: synced.name,
            role: synced.role,
          };
        }
      } catch (syncErr) {
        console.warn("[Auth] Failed to sync backend session on refresh:", syncErr);
      }
      localStorage.setItem("mock-user", JSON.stringify(finalUser));
      setUser(finalUser);
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
