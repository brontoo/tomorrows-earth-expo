// src/pages/AuthCallback.tsx
// يُعالج redirect بعد Google OAuth — يجلب الـ role من DB تلقائياً
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const result = await supabase.auth.getSessionFromUrl();
      const { data: { session }, error } = result;

      if (error) {
        console.error("[AuthCallback] Error:", error.message);
        window.location.href = "/login?error=auth_failed";
        return;
      }

      if (session) {
        localStorage.removeItem("selectedRole");
        window.history.replaceState({}, document.title, "/");
        window.location.href = "/";
      } else {
        window.location.href = "/login?error=no_session";
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground font-medium text-sm">Signing you in...</p>
      </div>
    </div>
  );
}