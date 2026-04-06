import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { CheckCircle2, FileText, ThumbsUp, Clock, MessageSquare, Sparkles, CalendarDays } from "lucide-react";
import MyProjectsDashboard from "@/components/MyProjectsDashboard";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import { StudentDashboardLayout } from "@/components/StudentDashboardLayout";
import PageNavigation from "@/components/PageNavigation";
import { ProfileSettings } from "@/components/ProfileSettings";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Accent blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: accent }}
      />
      <div className="relative z-10 flex flex-col gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent + "22" }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") return;
    const uid = user?.id ?? user?.openId ?? null;
    if (!uid) return;

    // Fetch projects from Supabase
    supabase
      .from("projects")
      .select("*")
      .eq("supabase_uid", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMyProjects(data); });

    // Fetch assignment from localStorage (set by AssignmentWizard)
    try {
      const setup = JSON.parse(localStorage.getItem("project-setup") || "{}");
      if (setup.teacher) setAssignment({
        teacherName: setup.teacher,
        mainCategoryId: setup.categoryName,
        subcategoryId: setup.subcategory,
      });
    } catch {}
  }, [isAuthenticated, user]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in as a student to access the dashboard.
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Login</a>
          </Button>
        </div>
      </div>
    );
  }

  // ── Wrong role ──
  if (user?.role !== "student") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            This dashboard is only accessible to students.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Computed stats ──
  const submittedCount = myProjects?.filter((p: any) => p.status !== "draft").length ?? 0;
  const votesCount = myProjects?.reduce((acc: number, p: any) => acc + (p.votesCount ?? 0), 0) ?? 0;
  const feedbackCount = myProjects?.filter((p: any) => p.status === "rejected").length ?? 0;
  const deadline = new Date("2026-05-14");
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));

  const firstName = (user?.name ?? "Student").split(" ")[0];
  const greeting = getGreeting();

  return (
    <StudentDashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-8">

        {/* ══════════ DASHBOARD TAB ══════════ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* ── Hero Welcome Banner ── */}
            <div
              className="relative overflow-hidden rounded-3xl p-8 md:p-10"
              style={{
                background: "linear-gradient(135deg, #0f5c2e 0%, #1a8a47 55%, #22c55e 100%)",
              }}
            >
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white opacity-10" />
              <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full bg-white opacity-10" />
              <div className="absolute top-4 right-40 w-16 h-16 rounded-full bg-white opacity-10" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-green-200" />
                    <span className="text-green-200 text-xs font-semibold tracking-widest uppercase">
                      {greeting}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                    Welcome back, {firstName}! 👋
                  </h1>

                  <p className="text-green-100/80 text-sm font-medium max-w-md">
                    Here's an overview of your project progress and upcoming deadlines for Tomorrow's Earth Expo 2026.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                    <CalendarDays size={13} className="text-green-200" />
                    <span className="text-white text-xs font-bold">
                      Expo deadline — {daysLeft} days remaining
                    </span>
                  </div>
                </div>

                {/* Avatar initial */}
                <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white text-4xl font-black flex-shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* ── Stat Cards ── */}
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
                sub="May 14, 2026"
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

            {/* ── Select Your Teacher ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Step 1 — Select Your Teacher
                </h2>
              </div>
              <div className="p-6">
                <p className="text-slate-500 text-sm font-medium mb-5">
                  Please select your teacher from the dropdown below to begin your project.
                </p>
                <AssignmentWizard />
              </div>
            </div>

            {/* ── Assignment Summary (visible only when assigned) ── */}
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
                      <div key={label} className="bg-white/80 rounded-xl p-4 border border-green-100">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-green-600/70 mb-1">{label}</p>
                        <p className="font-bold text-slate-800 text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════ PROJECTS TAB ══════════ */}
        {activeTab === "projects" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <MyProjectsDashboard />
          </div>
        )}

        {/* ══════════ PROFILE TAB ══════════ */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ProfileSettings />
          </div>
        )}

      </div>
    </StudentDashboardLayout>
  );
}