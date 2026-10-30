import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  Ticket,
} from "lucide-react";
import {
  EntryHeader,
  EntryScene,
  EntryFooter,
  ExperienceIcon,
} from "@/components/entry/EntryScene";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/contexts/AuthContext";

type LoginRole = "admin" | "teacher" | "student" | "visitor";

export default function Login() {
  // Keep the chosen experience through authentication, using internal routes only.
  const requested = new URLSearchParams(window.location.search).get(
    "redirectTo"
  );
  const destination =
    requested?.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.includes("\\")
      ? requested
      : "/eco-journey";
  const expo =
    destination === "/dashboard" || destination.startsWith("/innovation-hub");
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginMutation = trpc.auth.loginWithEmail.useMutation();
  const syncUserMutation = trpc.auth.syncUser.useMutation();

  useEffect(() => {
    if (authLoading || !isAuthenticated || isLoading) return;

    setLocation(destination);
  }, [authLoading, isAuthenticated, isLoading, setLocation, destination]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let authenticatedUser;

      try {
        const result = await loginMutation.mutateAsync({
          email: normalizedEmail,
          password,
        });
        authenticatedUser = result.user;
      } catch (localLoginError) {
        // Legacy accounts were created in Supabase before local password hashes existed.
        const { data, error: supabaseError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (supabaseError || !data.user) {
          throw localLoginError;
        }

        const synced = await syncUserMutation.mutateAsync({
          email: normalizedEmail,
          name:
            data.user.user_metadata?.full_name ??
            normalizedEmail.split("@")[0] ??
            "User",
          openId: data.user.id,
        });
        authenticatedUser = synced.user;
      }

      const storedRole = authenticatedUser?.role as string | undefined;
      const resolvedRole =
        ((storedRole === "public" ? "visitor" : storedRole) as LoginRole) ||
        "student";
      const userId = String(authenticatedUser?.id ?? "user-id");

      const authUser = {
        id: userId,
        openId: `email:${normalizedEmail}`,
        email: normalizedEmail,
        name: String(email.split("@")[0] || "User"),
        role: resolvedRole,
      };

      localStorage.setItem("mock-user", JSON.stringify(authUser));

      // Reload the authenticated destination so the shared auth provider reads the new session cookie.
      window.location.assign(destination);
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="entry-page entry-login">
      <EntryHeader login />
      <main id="main-content" className="entry-login-main">
        <EntryScene compact />
        <section className="entry-login-desk" aria-labelledby="login-title">
          <div className="entry-login-paper">
            <div className="entry-kicker">
              <Ticket size={16} /> YOUR NEXT CHAPTER
            </div>
            <div className="entry-destination">
              <ExperienceIcon expo={expo} />
              <span>
                YOU’RE HEADING TO
                <strong>
                  {expo
                    ? "The Expo Platform"
                    : destination === "/eco-journey"
                      ? "The Eco Train Journey"
                      : "Your next discovery"}
                </strong>
              </span>
              <Link href="/" aria-label="Change your experience">
                <ArrowLeft size={17} />
              </Link>
            </div>
            <h1 id="login-title">
              Good to
              <br />
              have you <em>here.</em>
            </h1>
            <p className="entry-login-subtitle">
              Sign in and pick up your part in a better tomorrow.
            </p>
            <form
              onSubmit={handleEmailLogin}
              className="entry-login-form"
              aria-busy={isLoading}
            >
              <div className="entry-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="entry-field">
                <label htmlFor="password">Password</label>
                <div className="entry-password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="entry-form-error" role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                className="entry-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle size={18} className="entry-loading-icon" />
                    <span role="status">Signing in…</span>
                  </>
                ) : (
                  <>
                    Sign in & continue <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>
            <p className="entry-signup">
              New to Tomorrow’s Earth?{" "}
              <Link href="/signup">
                Create an account <ArrowRight size={14} />
              </Link>
            </p>
            <div className="entry-ticket-bottom">
              <span>CURIOUS MINDS WELCOME</span>
              <span aria-hidden="true">▎▏▍▎▎▏▍▏▎▍</span>
            </div>
          </div>
        </section>
      </main>
      <EntryFooter />
    </div>
  );
}
