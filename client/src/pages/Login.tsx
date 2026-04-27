import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { Loader, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";

type LoginRole = "admin" | "teacher" | "student" | "visitor";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginMutation = trpc.auth.loginWithEmail.useMutation();

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
      });

      const resolvedRole: LoginRole = (result.user?.role as LoginRole) || "visitor";

      const authUser = {
        id: result.user?.id,
        openId: `email:${email.toLowerCase()}`,
        email: result.user?.email ?? email,
        name: result.user?.name || email.split("@")[0] || "User",
        role: resolvedRole,
      };

      localStorage.setItem("mock-user", JSON.stringify(authUser));

      if (resolvedRole === "visitor" || !result.user?.role) {
        setLocation("/choose-role");
      } else {
        const dashboardMap: Record<string, string> = {
          student: "/student/dashboard",
          teacher: "/teacher/dashboard",
          admin: "/admin/dashboard",
        };
        setLocation(dashboardMap[resolvedRole] || "/");
      }
    } catch (err: any) {
      const raw: string = err?.message ?? "";
      const isParseError = raw.includes("Unexpected end of JSON") || raw.includes("JSON input");
      setError(isParseError ? "Server is unavailable. Please try again." : raw || "Login failed. Please check your credentials.");
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
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground/80 ml-1">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/50 border-border"
                    />
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground/80 ml-1">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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
                </div>

                {error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-destructive text-xs font-semibold flex items-start gap-2">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full premium-gradient text-white font-bold" disabled={isLoading}>
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : "Login"}
                </Button>
              </form>
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
