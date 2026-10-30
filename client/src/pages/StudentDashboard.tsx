import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { StudentJourneyOverview } from "@/components/field/StudentJourneyOverview";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
} from "@/components/field/GameShell";
import {
  CheckCircle2,
  FileText,
  ThumbsUp,
  Clock,
  MessageSquare,
  BookOpen,
  ExternalLink,
  Loader2,
} from "lucide-react";
import MyProjectsDashboard from "@/components/MyProjectsDashboard";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import { StudentDashboardLayout } from "@/components/StudentDashboardLayout";
import { ProfileSettings } from "@/components/ProfileSettings";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <article className="field-school-stat">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <p>{sub}</p>}
    </article>
  );
}

// A local, accessible summary of the existing school-project metrics.
function ProjectsChart({
  submitted,
  votes,
  feedback,
  daysLeft,
}: {
  submitted: number;
  votes: number;
  feedback: number;
  daysLeft: number;
}) {
  const items = [
    ["Submitted projects", submitted],
    ["Votes received", votes],
    ["Feedback pending", feedback],
    ["Days until deadline", daysLeft],
  ] as const;
  const max = Math.max(1, ...items.map(([, value]) => value));
  return (
    <section className="field-panel">
      <span className="field-kicker">YOUR SCHOOL PROJECTS</span>
      <h2>A snapshot of your progress.</h2>
      <ul className="field-school-chart">
        {items.map(([label, value]) => (
          <li key={label}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <span aria-hidden="true">
              <i style={{ width: `${(value / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Wikipedia Learn More ─────────────────────────────────────────────────────
const CATEGORY_WIKI: Record<string, { title: string; query: string }> = {
  environmental: {
    title: "Environmental Protection",
    query: "Environmental_protection",
  },
  community: { title: "Sustainable Community", query: "Sustainable_community" },
  innovation: { title: "Green Innovation", query: "Green_innovation" },
  education: {
    title: "Environmental Education",
    query: "Environmental_education",
  },
};

function WikiLearnMore({ categorySlug }: { categorySlug: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wiki = CATEGORY_WIKI[categorySlug] || CATEGORY_WIKI["environmental"];

  const fetchWiki = async () => {
    if (summary) {
      setOpen(!open);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${wiki.query}`
      );
      const data = await res.json();
      setSummary(data.extract || "No summary available.");
    } catch {
      setSummary("Could not load information at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={fetchWiki}
        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-3 py-1.5"
      >
        <BookOpen size={12} />
        {open ? "Hide Info" : `Learn About ${wiki.title}`}
        <ExternalLink size={10} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-4 animate-in fade-in duration-300">
          {loading ? (
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs font-medium">
                Loading from Wikipedia...
              </span>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-4">
                {summary}
              </p>
              <a
                href={`https://en.wikipedia.org/wiki/${wiki.query}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 mt-2"
              >
                <ExternalLink size={10} /> Read more on Wikipedia
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuthContext();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);

  const { data: projectsData } = trpc.projects.getMyProjects.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === "student",
    }
  );

  const { data: unreadNotifData } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    {
      staleTime: 60_000,
      refetchInterval: 60_000,
      enabled: isAuthenticated && user?.role === "student",
    }
  );

  useEffect(() => {
    if (projectsData) setMyProjects(projectsData);
  }, [projectsData]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") return;
    try {
      const setup = JSON.parse(localStorage.getItem("project-setup") || "{}");
      if (setup.teacher) {
        setAssignment({
          teacherName: setup.teacher,
          mainCategoryId: setup.categoryName,
          subcategoryId: setup.subcategory,
        });
      }
    } catch {}
  }, [isAuthenticated, user]);

  if (loading)
    return (
      <GameShell>
        <FieldNotice>Preparing your field station…</FieldNotice>
      </GameShell>
    );
  if (!isAuthenticated)
    return (
      <GameShell>
        <FieldHeading
          eyebrow="YOUR STUDENT FIELD STATION"
          title="Your next chapter is waiting."
          description="Sign in with your student account to continue your journey."
        />
        <Link
          className="field-button"
          href="/login?redirectTo=%2Fstudent%2Fdashboard"
        >
          Sign in
        </Link>
      </GameShell>
    );
  if (user?.role !== "student")
    return (
      <GameShell>
        <FieldHeading
          eyebrow="STUDENT FIELD STATION"
          title="A space for student explorers."
          description="This dashboard is available to student accounts."
        />
        <Link className="field-button" href="/">
          Choose an experience
        </Link>
      </GameShell>
    );

  // Stats
  const submittedCount =
    myProjects?.filter((p: any) => p.status !== "draft").length ?? 0;
  const votesCount =
    myProjects?.reduce((acc: number, p: any) => acc + (p.votesCount ?? 0), 0) ??
    0;
  const feedbackCount =
    unreadNotifData?.unreadCount ??
    myProjects?.filter((p: any) => p.status === "rejected").length ??
    0;
  const deadline = new Date("2026-05-05");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / 86400000)
  );

  // Category slug from assignment
  const categorySlug = (() => {
    try {
      const setup = JSON.parse(localStorage.getItem("project-setup") || "{}");
      return (setup.categoryName || "environmental")
        .toLowerCase()
        .replace(/\s+/g, "");
    } catch {
      return "environmental";
    }
  })();

  return (
    <StudentDashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-8">
        {/* ══ DASHBOARD TAB ══ */}
        {activeTab === "dashboard" && <StudentJourneyOverview />}
        {activeTab === "school" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <FieldHeading
              eyebrow="YOUR SCHOOL WORKSPACE"
              title="Ideas worth bringing to life."
              description="Your Expo projects, teacher assignment, and school feedback in one place."
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FileText}
                label="Projects Submitted"
                value={submittedCount}
                sub={submittedCount === 0 ? "No projects yet" : "Great work!"}
                accent="#22c55e"
              />
              <StatCard
                icon={ThumbsUp}
                label="Votes Received"
                value={votesCount}
                sub="Community support"
                accent="#3b82f6"
              />
              <StatCard
                icon={Clock}
                label="Days Until Deadline"
                value={daysLeft}
                sub="May 5, 2026"
                accent="#f59e0b"
              />
              <StatCard
                icon={MessageSquare}
                label="Feedback Pending"
                value={feedbackCount}
                sub={feedbackCount === 0 ? "All reviewed" : "Needs attention"}
                accent="#8b5cf6"
              />
            </div>

            {/* 📊 Chart + Teacher Wizard جنباً إلى جنب */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* QuickChart */}
              <ProjectsChart
                submitted={submittedCount}
                votes={votesCount}
                feedback={feedbackCount}
                daysLeft={daysLeft}
              />

              {/* Select Your Teacher */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden h-full">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Step 1 — Select Your Teacher
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-slate-500 text-sm font-medium mb-5">
                    Please select your teacher from the dropdown below to begin
                    your project.
                  </p>
                  <AssignmentWizard />
                </div>
              </div>
            </div>

            {/* Assignment Summary */}
            {assignment && (
              <div className="relative overflow-hidden rounded-2xl border border-green-200/60 bg-green-50/60 backdrop-blur-sm p-6 animate-in fade-in duration-700">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 bg-green-400" />
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-green-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <CheckCircle2 size={16} className="text-green-600" />
                    Your Configured Environment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: "Teacher", value: assignment.teacherName },
                      { label: "Category", value: assignment.mainCategoryId },
                      { label: "Subcategory", value: assignment.subcategoryId },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="bg-white/80 rounded-xl p-4 border border-green-100"
                      >
                        <p className="text-[10px] uppercase tracking-widest font-bold text-green-600/70 mb-1">
                          {label}
                        </p>
                        <p className="font-bold text-slate-800 text-sm">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PROJECTS TAB ══ */}
        {activeTab === "projects" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
            {/* Wikipedia Learn More Card */}
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 px-6 py-4 flex items-start gap-3">
              <BookOpen
                size={16}
                className="text-blue-500 mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">
                  Learn About Your Category
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Explore background knowledge about your project's
                  environmental category.
                </p>
                <WikiLearnMore categorySlug={categorySlug} />
              </div>
            </div>
            <MyProjectsDashboard />
          </div>
        )}

        {/* ══ PROFILE TAB ══ */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ProfileSettings />
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
}
