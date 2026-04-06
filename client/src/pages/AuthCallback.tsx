// src/pages/AuthCallback.tsx
// يُعالج redirect بعد Google OAuth — يجلب الـ role من DB تلقائياً
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export default function AuthCallback() {
  const syncUser = trpc.auth.syncUser.useMutation();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSessionFromUrl();

      if (error) {
        console.error("[AuthCallback] Error:", error.message);
        window.location.href = "/login?error=auth_failed";
        return;
      }

      if (!session?.user) {
        window.location.href = "/login?error=no_session";
        return;
      }

      try {
        const selectedRole = localStorage.getItem("selectedRole") as
'teacher' | 'student' | 'admin' | null;
        await syncUser.mutateAsync({
          email: session.user.email ?? "",
          name:
            session.user.user_metadata?.full_name ??
            session.user.email?.split("@")[0] ??
            "Google User",
          openId: session.user.id,
          role: selectedRole as "admin" | "teacher" | "student" | undefined,
        });
      } catch (syncError) {
        console.warn("[AuthCallback] syncUser failed:", syncError);
      } finally {
        localStorage.removeItem("selectedRole");
        window.location.href = "/";
      }
    };

    handleCallback();
  }, [syncUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground font-medium text-sm">Signing you in...</p>
      </div>
    </div>
  );
}