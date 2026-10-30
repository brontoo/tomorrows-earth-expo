import type { ReactNode } from "react";
import { Link } from "wouter";
import { GameShell } from "@/components/field/GameShell";
import {
  Compass,
  FileText,
  Settings,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
export function StudentDashboardLayout({
  children,
  activeTab = "dashboard",
  onTabChange,
}: {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const tabs = [
    ["dashboard", "My journey", Compass],
    ["school", "School workspace", BookOpen],
    ["projects", "My projects", FileText],
    ["profile", "Profile settings", Settings],
  ] as const;
  return (
    <GameShell>
      <nav className="field-dashboard-tabs" aria-label="Dashboard sections">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            aria-current={id === activeTab ? "page" : undefined}
            onClick={() => onTabChange?.(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <div>
          <Link href="/vote">
            Voting area <ArrowUpRight size={13} />
          </Link>
          <Link href="/resources">
            Resources <ArrowUpRight size={13} />
          </Link>
        </div>
      </nav>
      <div
        className={activeTab === "dashboard" ? "" : "field-school-workspace"}
      >
        {children}
      </div>
    </GameShell>
  );
}
