import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Loader, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const syncUserMutation = trpc.auth.syncUser.useMutation({
    onSuccess: (data) => {
      console.log("[Auth] Sync successful:", data.user);
      // Redirect to dashboard based on role
      const role = data.user.role;
      const dashboardMap: Record<string, string> = {
        admin: "/admin/dashboard",
        teacher: "/teacher/dashboard",
        student: "/student/dashboard",
      };
      setLocation(dashboardMap[role] || "/student/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Failed to synchronize your account.");
    },
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          const user = session.user;
          console.log("[Auth] Supabase session found for:", user.email);

          // Call backend to sync user and set local JWT cookie
          const role = (localStorage.getItem("selectedRole") as any) || "student";

          try {
            await syncUserMutation.mutateAsync({
              email: user.email!,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              openId: user.id,
              role: role,
            });
          } catch (err) {
            console.warn("[Auth] TRPC sync failed, using local fallback since backend may be off.");
            // Vercel static fallback
            localStorage.setItem("mock-user", JSON.stringify({
              id: user.id || 1,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: role
            }));

            const dashboardMap: Record<string, string> = {
              admin: "/admin/dashboard",
              teacher: "/teacher/dashboard",
              student: "/student/dashboard",
            };
            setLocation(dashboardMap[role] || "/student/dashboard");
          }
        } else {
          // No session found, redirect to login
          setLocation("/login");
        }
      } catch (err: any) {
        console.error("[Auth] Callback error:", err);
        setError(err.message || "An error occurred during authentication.");
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => setLocation("/login")}
              className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Authenticating...</h2>
      <p className="text-slate-400">Completing your secure sign-in</p>
    </div>
  );
}
