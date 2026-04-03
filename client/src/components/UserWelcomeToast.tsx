import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

/**
 * Component that shows a welcome toast message after user login.
 * Displays user's name and role, then auto-dismisses after 5 seconds.
 */
export function UserWelcomeToast() {
  const { user, isAuthenticated } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    // Show welcome toast only once per session when user logs in
    if (isAuthenticated && user && !hasShownWelcome) {
      setShowWelcome(true);
      setHasShownWelcome(true);
    }
  }, [isAuthenticated, user, hasShownWelcome]);

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  if (!showWelcome || !user) return null;

  const roleLabel =
    user.role === "student"
      ? "Student"
      : user.role === "teacher"
        ? "Teacher"
        : user.role === "admin"
          ? "Administrator"
          : "User";

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <Card className="glass-card border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-5 flex items-start justify-between border-b border-white/10 bg-white/5">
          <div className="flex-1">
            <h3 className="text-xl font-black text-foreground mb-1">
              Welcome back, {user.name}! 👋
            </h3>
            <p className="text-sm font-medium text-muted-foreground pt-1">
              Logged in as <span className="text-primary font-bold">{roleLabel}</span>
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4 p-1 rounded-full hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>
      </Card>
    </div>
  );
}
