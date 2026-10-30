import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Leaf, X } from "lucide-react";
import "./welcome.css";

/** One quiet welcome per signed-in account in this browser session. */
export function UserWelcomeToast() {
  const { user, isAuthenticated, loading } = useAuthContext();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    const key = `tee-welcome:v1:${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "shown");
    } catch {
      /* The welcome still works without storage. */
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [loading, isAuthenticated, user?.id]);
  if (!visible || !user) return null;
  const role =
    user.role === "student"
      ? "Student"
      : user.role === "teacher"
        ? "Teacher"
        : user.role === "admin"
          ? "Administrator"
          : "Explorer";
  return (
    <aside className="field-welcome" role="status" aria-live="polite">
      <Leaf size={22} strokeWidth={1.3} />
      <div>
        <strong>Good to see you, {user.name.split(" ")[0]}.</strong>
        <span>{role} · Tomorrow’s Earth Expo</span>
      </div>
      <button aria-label="Dismiss welcome" onClick={() => setVisible(false)}>
        <X size={17} />
      </button>
    </aside>
  );
}
