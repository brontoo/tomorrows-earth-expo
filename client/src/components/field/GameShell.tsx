import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  TrainFront,
  Compass,
  BookOpen,
  Leaf,
  LayoutDashboard,
  Ticket,
  AlertCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { EntryBrand } from "@/components/entry/EntryScene";
import { useAuthContext } from "@/contexts/AuthContext";
import { stations, journeyScenes } from "@/components/game/train/journeyScenes";
import "./field.css";

export const stageFor = (slug?: string) =>
  stations.find(station => station.missionSlug === slug);
export const stageNumber = (slug?: string) =>
  stations.findIndex(station => station.missionSlug === slug) + 1;
export const stageImage = (slug?: string) =>
  journeyScenes[stageFor(slug)?.scene ?? 1].image;
const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  submitted: "Awaiting review",
  verification_required: "Verification required",
  revision_requested: "Revision requested",
  completed: "Mission complete",
  verified: "Mission complete",
  rejected: "Not accepted",
};
export const missionStatus = (status?: string) =>
  STATUS_LABELS[status ?? ""] ?? "Ready to explore";

export function GameShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuthContext();
  const links = [
    ["/eco-journey", "Eco Train", TrainFront],
    ["/missions", "Missions", Compass],
    ["/my-journey", "Passport", Ticket],
    ["/explore", "Explore", BookOpen],
    ["/impact", "Our impact", Leaf],
    ["/student/dashboard", "My dashboard", LayoutDashboard],
  ] as const;
  return (
    <div className="field-app">
      <header className="field-header">
        <EntryBrand />
        <div className="field-user">
          {isAuthenticated ? (
            <>
              <span>YOUR FIELD STATION</span>
              <Link href="/student/dashboard">
                {user?.name || "My dashboard"} <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <Link
              className="field-text-link"
              href={"/login?redirectTo=" + encodeURIComponent(location)}
            >
              Sign in <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </header>
      <nav className="field-nav" aria-label="Student journey">
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              location === href ||
              (href === "/missions" && location.startsWith("/missions/")) ||
              (href === "/explore" && location.startsWith("/explore/"))
                ? "page"
                : undefined
            }
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
      <main className="field-main">{children}</main>
      <footer className="field-footer">
        <span>A SMALL STEP. A LASTING IMPACT.</span>
        <span>Tomorrow’s Earth Expo · Um Al Emarat School</span>
      </footer>
    </div>
  );
}
export function FieldHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="field-page-heading">
      <div>
        <span className="field-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function FieldNotice({
  children,
  error = false,
  onRetry,
}: {
  children: ReactNode;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      className={`field-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error && <AlertCircle size={18} />}
      <span>{children}</span>
      {onRetry && (
        <button className="field-text-link" onClick={onRetry}>
          Try again <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
export function FieldGuard({ children }: { children: ReactNode }) {
  return (
    <GameShell>
      <div className="field-empty">{children}</div>
    </GameShell>
  );
}
