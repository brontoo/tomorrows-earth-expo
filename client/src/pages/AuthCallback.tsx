// src/pages/AuthCallback.tsx
// ???? ??? ???????? ???????? ?? ????? ???????? � ???? tRPC

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { detectRoleFromDB } from "@/_core/hooks/useAuth";

type Role = "admin" | "teacher" | "student" | "visitor";

const DASHBOARD: Record<Role, string> = {
  admin:   "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  visitor: "/vote",
};

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handle = async () => {
      try {
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(sessionError?.message || "No session found");
        }

        const user = session.user;
        const email = user.email ?? "";
        const metadataRole = user.user_metadata?.role as Role | undefined;

        let actualRole = await detectRoleFromDB(email, user.id, metadataRole);
        const requestedRole = localStorage.getItem("requestedRole") as Role | null;

        if (actualRole === "visitor" && requestedRole) {
          actualRole = requestedRole;
          await supabase.auth.updateUser({ data: { role: requestedRole } });
        }

        if (requestedRole && requestedRole !== actualRole) {
          setErrorMsg(`This email is registered as ${actualRole} and cannot access the ${requestedRole} portal.`);
          localStorage.removeItem("requestedRole");
          setStatus("error");
          return;
        }

        const mockUser = {
          id:     user.id,
          openId: user.id,
          email,
          name:   user.user_metadata?.full_name ?? email.split("@")[0] ?? "User",
          role:   actualRole,
        };
        localStorage.setItem("mock-user", JSON.stringify(mockUser));
        localStorage.removeItem("requestedRole");

        window.location.href = DASHBOARD[actualRole];
      } catch (err: any) {
        console.error("[AuthCallback]", err?.message);
        setErrorMsg(err?.message || "Authentication failed");
        setStatus("error");
      }
    };

    handle();
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">??</span>
          </div>
          <h2 className="text-xl font-black text-slate-800">Authentication Error</h2>
          <p className="text-sm text-slate-500 font-medium">{errorMsg}</p>
          <button
            onClick={() => window.location.href = "/choose-role"}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Back to Role Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-base font-black text-slate-700">Signing you in...</p>
        <p className="text-xs text-slate-400 font-medium mt-1">Detecting your role and matching your selected portal</p>
      </div>
    </div>
  );
}
