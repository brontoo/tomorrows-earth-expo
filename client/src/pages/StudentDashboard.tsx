import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  CheckCircle2, FileText, ThumbsUp, Clock, MessageSquare,
  Sparkles, CalendarDays, CloudSun, Leaf, Wind, BarChart3,
  BookOpen, ExternalLink, Loader2, TrendingUp,
} from "lucide-react";
import MyProjectsDashboard from "@/components/MyProjectsDashboard";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import { StudentDashboardLayout } from "@/components/StudentDashboardLayout";
import { ProfileSettings } from "@/components/ProfileSettings";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// ─── Greeting ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: accent }} />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}22` }}>
          <Icon size={20} style={{ color: accent }} />
        </div>
        <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Abu Dhabi Weather Widget ─────────────────────────────────────────────────
function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: number; wind: number; code: number } | null>(null);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=24.4539&longitude=54.3773&current_weather=true&timezone=Asia%2FDubai")
      .then(r => r.json())
      .then(d => {
        if (d.current_weather) {
          setWeather({
            temp: Math.round(d.current_weather.temperature),
            wind: Math.round(d.current_weather.windspeed),
            code: d.current_weather.weathercode,
          });
        }
      })
      .catch(() => { });
  }, []);

  const getEmoji = (code: number) => {
    if (code === 0) return { emoji: "☀️", label: "Clear" };
    if (code <= 3) return { emoji: "⛅", label: "Partly Cloudy" };
    if (code <= 48) return { emoji: "🌫️", label: "Foggy" };
    if (code <= 67) return { emoji: "🌧️", label: "Rainy" };
    return { emoji: "⛈️", label: "Stormy" };
  };

  if (!weather) return null;
  const { emoji, label } = getEmoji(weather.code);

  return (
    <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-2.5 mt-4">
      <CloudSun size={14} className="text-green-200 flex-shrink-0" />
      <span className="text-white/80 text-xs font-medium">Abu Dhabi</span>
      <span className="text-white font-black text-sm">{emoji} {weather.temp}°C</span>
      <span className="text-green-200 text-xs font-medium">{label}</span>
      <div className="flex items-center gap-1 text-white/60 text-xs">
        <Wind size={10} />
        {weather.wind} km/h
      </div>
    </div>
  );
}

// ─── Carbon Interface (Impact Tab) ───────────────────────────────────────────
// Carbon Interface API مجاني بعد تسجيل — نستخدم endpoint التقدير المباشر
const CARBON_KEY = "YOUR_CARBON_INTERFACE_KEY"; // ← ضع key هنا لاحقاً

interface CarbonResult {
  category: string;
  saved_kg: number;
  trees: number;
  description: string;
  icon: string;
}

const IMPACT_ACTIVITIES: CarbonResult[] = [
  { category: "Reducing Plastic Use", saved_kg: 12, trees: 1, description: "Eliminating single-use plastics for one month saves approx. 12kg CO₂", icon: "♻️" },
  { category: "Solar Energy Project", saved_kg: 45, trees: 2, description: "A small solar panel system offsets ~45kg CO₂ per year", icon: "☀️" },
  { category: "Tree Planting", saved_kg: 21, trees: 1, description: "Each mature tree absorbs ~21kg of CO₂ per year", icon: "🌱" },
  { category: "Water Conservation", saved_kg: 8, trees: 0.5, description: "Reducing water usage by 20% saves ~8kg CO₂ in energy", icon: "💧" },
  { category: "School Composting", saved_kg: 30, trees: 1.5, description: "Composting school waste reduces landfill CO₂ by ~30kg", icon: "🌿" },
];

function ImpactTab({ projects }: { projects: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const totalSaved = projects.length * 22; // تقدير بناءً على عدد المشاريع
  const totalTrees = Math.round(totalSaved / 21);
  const activity = IMPACT_ACTIVITIES[selectedCategory];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Hero Impact Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}>
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full bg-white opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={15} className="text-green-300" />
            <span className="text-green-300 text-xs font-semibold tracking-widest uppercase">Your Environmental Impact</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
            🌍 You Could Save
          </h2>
          <p className="text-5xl font-black text-green-300 leading-none mb-1">{totalSaved} kg</p>
          <p className="text-green-200/70 text-sm font-medium">of CO₂ through your {projects.length} project{projects.length !== 1 ? "s" : ""}</p>

          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: "CO₂ Equivalent", value: `${totalSaved} kg`, icon: "💨" },
              { label: "Trees Equivalent", value: `${totalTrees} trees`, icon: "🌳" },
              { label: "Car km Offset", value: `${Math.round(totalSaved * 6)} km`, icon: "🚗" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-black text-white">{icon} {value}</p>
                <p className="text-xs text-green-200 font-bold uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Explorer */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
            🔍 Explore Impact by Activity
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">Select an activity to see its environmental impact</p>
        </div>
        <div className="p-6">
          {/* Activity Selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {IMPACT_ACTIVITIES.map((a, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategory(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${selectedCategory === i
                    ? "bg-green-500 text-white shadow-md scale-105"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <span>{a.icon}</span> {a.category}
              </button>
            ))}
          </div>

          {/* Selected Activity Details */}
          <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{activity.icon}</span>
              <div className="flex-1">
                <h4 className="text-lg font-black text-slate-800 mb-1">{activity.category}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{activity.description}</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                    <p className="text-2xl font-black text-green-600">{activity.saved_kg}kg</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">CO₂ Saved</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                    <p className="text-2xl font-black text-emerald-600">{activity.trees}🌳</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Trees Equiv.</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                    <p className="text-2xl font-black text-teal-600">{Math.round(activity.saved_kg * 6)}km</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Car Offset</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data note */}
      <p className="text-xs text-slate-400 font-medium text-center">
        💡 Impact estimates based on Carbon Interface methodology • Add your Carbon Interface API key to enable live calculations
      </p>
    </div>
  );
}

// ─── QuickChart Component ─────────────────────────────────────────────────────
function ProjectsChart({ submitted, votes, feedback, daysLeft }: {
  submitted: number; votes: number; feedback: number; daysLeft: number;
}) {
  const barChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: "bar",
    data: {
      labels: ["Submitted", "Votes Received", "Feedback", "Days Left"],
      datasets: [{
        label: "Your Progress",
        data: [submitted, votes, feedback, daysLeft],
        backgroundColor: ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b"],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
        x: { grid: { display: false } },
      },
    },
  }))}&backgroundColor=white&width=600&height=250`;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <BarChart3 size={16} className="text-green-500" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Your Progress Overview</h3>
        <span className="ml-auto text-[10px] text-slate-400 font-medium">via QuickChart</span>
      </div>
      <div className="p-4">
        <img
          src={barChartUrl}
          alt="Progress Chart"
          className="w-full rounded-xl"
          loading="lazy"
        />
      </div>
    </div>
  );
}

// ─── Wikipedia Learn More ─────────────────────────────────────────────────────
const CATEGORY_WIKI: Record<string, { title: string; query: string }> = {
  environmental: { title: "Environmental Protection", query: "Environmental_protection" },
  community: { title: "Sustainable Community", query: "Sustainable_community" },
  innovation: { title: "Green Innovation", query: "Green_innovation" },
  education: { title: "Environmental Education", query: "Environmental_education" },
};

function WikiLearnMore({ categorySlug }: { categorySlug: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wiki = CATEGORY_WIKI[categorySlug] || CATEGORY_WIKI["environmental"];

  const fetchWiki = async () => {
    if (summary) { setOpen(!open); return; }
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
              <span className="text-xs font-medium">Loading from Wikipedia...</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-4">{summary}</p>
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
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);

  const { data: projectsData } = trpc.projects.getMyProjects.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "student",
  });

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
    } catch { }
  }, [isAuthenticated, user]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Please Login</h2>
        <p className="text-muted-foreground mb-6">You need to be logged in as a student to access the dashboard.</p>
        <Button asChild><a href={getLoginUrl()}>Login</a></Button>
      </div>
    </div>
  );

  if (user?.role !== "student") return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">This dashboard is only accessible to students.</p>
        <Link href="/"><Button>Go Home</Button></Link>
      </div>
    </div>
  );

  // Stats
  const submittedCount = myProjects?.filter((p: any) => p.status !== "draft").length ?? 0;
  const votesCount = myProjects?.reduce((acc: number, p: any) => acc + (p.votesCount ?? 0), 0) ?? 0;
  const { data: unreadNotifData } = trpc.notifications.getUnreadCount.useQuery(undefined, { staleTime: 60_000, refetchInterval: 60_000 });
  const feedbackCount = unreadNotifData?.unreadCount ?? myProjects?.filter((p: any) => p.status === "rejected").length ?? 0;
  const deadline = new Date("2026-05-05");
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const firstName = (user?.name ?? "Student").split(" ")[0];
  const greeting = getGreeting();

  // Category slug from assignment
  const categorySlug = (() => {
    try {
      const setup = JSON.parse(localStorage.getItem("project-setup") || "{}");
      return (setup.categoryName || "environmental").toLowerCase().replace(/\s+/g, "");
    } catch { return "environmental"; }
  })();

  return (
    <StudentDashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-8">

        {/* ══ DASHBOARD TAB ══ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-10"
              style={{ background: "linear-gradient(135deg, #0f5c2e 0%, #1a8a47 55%, #22c55e 100%)" }}>
              <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white opacity-10" />
              <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full bg-white opacity-10" />
              <div className="absolute top-4 right-40 w-16 h-16 rounded-full bg-white opacity-10" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-green-200" />
                    <span className="text-green-200 text-xs font-semibold tracking-widest uppercase">{greeting}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                    Welcome back, {firstName}!
                  </h1>
                  <p className="text-green-100/80 text-sm font-medium max-w-md">
                    Here's an overview of your project progress and upcoming deadlines for Tomorrow's Earth Expo 2026.
                  </p>
                  {/* 🌤️ Weather Widget */}
                  <WeatherWidget />
                </div>
                <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white text-4xl font-black flex-shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={FileText} label="Projects Submitted" value={submittedCount}
                sub={submittedCount === 0 ? "No projects yet" : "Great work!"} accent="#22c55e" />
              <StatCard icon={ThumbsUp} label="Votes Received" value={votesCount}
                sub="Community support" accent="#3b82f6" />
              <StatCard icon={Clock} label="Days Until Deadline" value={daysLeft}
                sub="May 5, 2026" accent="#f59e0b" />
              <StatCard icon={MessageSquare} label="Feedback Pending" value={feedbackCount}
                sub={feedbackCount === 0 ? "All reviewed" : "Needs attention"} accent="#8b5cf6" />
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
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Step 1 — Select Your Teacher</h2>
                </div>
                <div className="p-6">
                  <p className="text-slate-500 text-sm font-medium mb-5">
                    Please select your teacher from the dropdown below to begin your project.
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

        {/* ══ PROJECTS TAB ══ */}
        {activeTab === "projects" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
            {/* Wikipedia Learn More Card */}
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 px-6 py-4 flex items-start gap-3">
              <BookOpen size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">
                  Learn About Your Category
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Explore background knowledge about your project's environmental category.
                </p>
                <WikiLearnMore categorySlug={categorySlug} />
              </div>
            </div>
            <MyProjectsDashboard />
          </div>
        )}

        {/* ══ IMPACT TAB (جديد) ══ */}
        {activeTab === "impact" && (
          <ImpactTab projects={myProjects} />
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