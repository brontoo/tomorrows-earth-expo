// src/pages/AuthCallback.tsx
// يحدد دور المستخدم تلقائياً من قاعدة البيانات — بدون tRPC

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "teacher" | "student" | "visitor";

// ─── Role detection logic ──────────────────────────────────────────────────────
async function detectRole(email: string, userId: string): Promise<Role> {

  // 1. هل هو Admin؟
  const { data: admin } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (admin) return "admin";

  // 2. هل هو معلم معتمد؟ (اسمه في approved_teachers)
  const { data: teacher } = await supabase
    .from("approved_teachers")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (teacher) return "teacher";

  // 3. هل سبق وسجّل مشروعاً كطالب؟
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("supabase_uid", userId)
    .limit(1)
    .maybeSingle();
  if (project) return "student";

  // 4. غير معروف — يذهب لصفحة اختيار الدور
  return "visitor";
}

// ─── Dashboard map ─────────────────────────────────────────────────────────────
const DASHBOARD: Record<Role, string> = {
  admin:   "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  visitor: "/choose-role",          // صفحة اختيار: طالب أم زائر
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handle = async () => {
      try {
        // 1. اجلب الـ session (تُعيد Supabase من URL hash تلقائياً)
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(sessionError?.message || "No session found");
        }

        const user  = session.user;
        const email = user.email ?? "";

        // 2. حدد الدور من DB
        const role = await detectRole(email, user.id);

        // 3. احفظ mock-user (يستخدمه useAuth في كل الصفحات)
        const mockUser = {
          id:     user.id,
          openId: user.id,
          email,
          name:   user.user_metadata?.full_name
                  ?? email.split("@")[0]
                  ?? "User",
          role,
        };
        localStorage.setItem("mock-user", JSON.stringify(mockUser));
        localStorage.setItem("selectedRole", role);
        localStorage.removeItem("selectedRole"); // نظّف القديم

        // 4. وجّه للـ dashboard الصحيح
        window.location.href = DASHBOARD[role];

      } catch (err: any) {
        console.error("[AuthCallback]", err?.message);
        setErrorMsg(err?.message || "Authentication failed");
        setStatus("error");
      }
    };

    handle();
  }, []);

  // ── Error screen ──
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-black text-slate-800">Authentication Error</h2>
          <p className="text-sm text-slate-500 font-medium">{errorMsg}</p>
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-base font-black text-slate-700">Signing you in...</p>
        <p className="text-xs text-slate-400 font-medium mt-1">Detecting your role</p>
      </div>
    </div>
  );
}