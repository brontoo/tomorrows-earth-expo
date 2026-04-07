import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { Loader, Eye, EyeOff, Mail, AlertTriangle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { detectRoleFromDB } from "@/_core/hooks/useAuth";

type LoginRole = "admin" | "teacher" | "student";

const DASHBOARD_MAP: Record<LoginRole, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export default function Login() {
  const [, setLocation] = useLocation();
  const [loginMethod, setLoginMethod] = useState<"oauth" | "email">("oauth");
  const [requestedRole, setRequestedRole] = useState<LoginRole>(() => {
    const stored = localStorage.getItem("requestedRole") as LoginRole | null;
    return stored === "admin" || stored === "teacher" || stored === "student" ? stored : "student";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      localStorage.setItem("requestedRole", requestedRole);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to start Google login.");
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      localStorage.setItem("requestedRole", requestedRole);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      const user = data?.user;
      if (!user) throw new Error("No user returned from Supabase");

      const metadataRole = user.user_metadata?.role as LoginRole | undefined;
      let actualRole = await detectRoleFromDB(email, user.id, metadataRole);
      if (actualRole === "visitor" && requestedRole) {
        actualRole = requestedRole;
        await supabase.auth.updateUser({ data: { role: requestedRole } });
      }

      if (requestedRole !== actualRole) {
        setError(`This email is registered as ${actualRole} and cannot access the ${requestedRole} portal.`);
        localStorage.removeItem("requestedRole");
        setIsLoading(false);
        return;
      }

      localStorage.setItem(
        "mock-user",
        JSON.stringify({
          id: user.id,
          openId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          role: actualRole,
        })
      );
      localStorage.removeItem("requestedRole");
      setLocation(DASHBOARD_MAP[actualRole]);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-leaf-green/20 via-background to-background flex flex-col">
      <Navigation />

      <div className="flex-1 container flex items-center justify-center py-12">
        <div className="w-full max-w-md animate-scaleIn">
          <Card className="glass-card border-white/20 shadow-2xl overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-leaf-green to-digital-cyan rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
                  <div className="relative glass-card p-4 rounded-full border-white/40">
                    <img
                      src="https://d2xsxph8kpxj0f.cloudfront.net/310519663327629652/4H46x9AiKyJYDgF5KtC5JK/tee-logo-icon-c4HyST3WbgCi982xP8aQdA.webp"
                      alt="TEE Logo"
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                </div>
              </div>
              <CardHeader className="p-0">
                <h2 className="text-3xl font-extrabold tracking-tight hero-text-glow text-foreground">Welcome Back</h2>
                <p className="text-muted-foreground mt-2 font-medium text-sm">
                  Sign in to Tomorrow's Earth Expo 2026
                </p>
              </CardHeader>
            </CardHeader>

            <CardContent className="px-8 pb-10 space-y-8">
              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground/80 ml-1">
                  Identify Yourself
                </Label>
                <div className="grid grid-cols-3 gap-2 p-1.5 glass-card rounded-xl border-white/10 bg-black/5">
                  {(["student", "teacher", "admin"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRequestedRole(role)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all duration-300 capitalize ${
                        requestedRole === role
                          ? "bg-white text-primary shadow-lg ring-1 ring-black/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Selected portal: <span className="font-semibold text-slate-900">{requestedRole}</span>
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full py-7 glass-card border-border hover:bg-black/5 flex items-center justify-center gap-3 group transition-all duration-300 active:scale-[0.98]"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                >
                  {isLoading && loginMethod === "oauth" ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        className="h-5 w-5 group-hover:scale-110 transition-transform"
                      />
                      <span className="font-bold text-foreground">Continue with Google</span>
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed px-4">
                  By continuing, you agree to the Tomorrow's Earth Expo Terms of Service and Privacy Policy.
                </p>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setLoginMethod(loginMethod === "email" ? "oauth" : "email")}
                    className="text-xs font-semibold text-primary/70 hover:text-primary transition-colors flex items-center justify-center gap-2 group"
                  >
                    <Mail className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                    {loginMethod === "email" ? "Back to Google login" : "Sign in with email instead"}
                  </button>

                  {loginMethod === "email" && (
                    <form onSubmit={handleEmailLogin} className="space-y-4 animate-slideInUp">
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/50 border-border"
                        />
                      </div>

                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/50 border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>

                      {error && (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-destructive text-xs font-semibold flex items-start gap-2">
                          <AlertTriangle size={16} />
                          <span>{error}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full premium-gradient text-white font-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : "Login"}
                      </Button>
                    </form>
                  )}

                  {error && loginMethod === "oauth" && (
                    <p className="text-destructive text-xs font-bold text-center">{error}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground font-medium">
              Don't have an account?{' '}
              <Link href="/signup">
                <span className="text-primary hover:underline cursor-pointer font-bold">Join the movement</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
