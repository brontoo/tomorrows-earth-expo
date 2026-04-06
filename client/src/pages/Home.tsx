import HeroSection from "@/components/HeroSection";
import CategorySelection from "@/components/CategorySelection";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Link } from "wouter";
import { OAuthRedirect } from "@/components/OAuthRedirect";
import ValueProposition from "@/components/ValueProposition";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard, LogIn, Globe, Users, Layers,
  CalendarDays, MapPin, Flag, Sparkles,
  ExternalLink, Wind, Thermometer, Leaf,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── NASA APOD hook ───────────────────────────────────────────────────────────
const NASA_KEY = "opzhq4SjSKyje1q0JqjgajekWW7OahVvKqvNItZe";
interface NasaApod { title: string; explanation: string; url: string; media_type: string; date: string; copyright?: string; }
function useNasaApod() {
  const [data, setData] = useState<NasaApod | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

// ─── Weather hook (Abu Dhabi) ─────────────────────────────────────────────────
interface WeatherData { temperature: number; windspeed: number; weathercode: number; }
function getWeatherInfo(code: number) {
  if (code === 0) return { label: "Clear Sky", emoji: "☀️", color: "#f59e0b" };
  if (code <= 3) return { label: "Partly Cloudy", emoji: "⛅", color: "#64748b" };
  if (code <= 48) return { label: "Foggy", emoji: "🌫️", color: "#94a3b8" };
  if (code <= 67) return { label: "Rainy", emoji: "🌧️", color: "#3b82f6" };
  return { label: "Stormy", emoji: "⛈️", color: "#6366f1" };
}
function useAbuDhabiWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=24.4539&longitude=54.3773&current_weather=true&timezone=Asia%2FDubai")
      .then(r => r.json()).then(d => { if (d.current_weather) setData({ temperature: Math.round(d.current_weather.temperature), windspeed: Math.round(d.current_weather.windspeed), weathercode: d.current_weather.weathercode }); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

// ─── Env Days hook ────────────────────────────────────────────────────────────
const CALENDARIFIC_KEY = "Cf52cNSeIC66ey2TAwZFCx1x2lIlv7bH";
interface EnvHoliday { name: string; date: { iso: string }; }
const ENV_KEYWORDS = ["earth", "environment", "water", "ocean", "forest", "wildlife", "climate", "energy", "recycl", "sustainab", "biodiversity", "ozone", "green", "ecology", "nature", "tree", "solar", "wind"];
const FALLBACK_DAYS = [
  { name: "World Earth Day", date: { iso: "2026-04-22" } },
  { name: "World Environment Day", date: { iso: "2026-06-05" } },
  { name: "World Oceans Day", date: { iso: "2026-06-08" } },
  { name: "International Day of Forests", date: { iso: "2026-03-21" } },
];
function useEnvDays() {
  const [days, setDays] = useState<EnvHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(`https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_KEY}&country=AE&year=${year}&type=observance`)
      .then(r => r.json()).then(d => {
        if (d.response?.holidays) {
          const today = new Date();
          const filtered = (d.response.holidays as EnvHoliday[]).filter(h => {
            if (new Date(h.date.iso) < today) return false;
            return ENV_KEYWORDS.some(kw => h.name.toLowerCase().includes(kw));
          }).sort((a, b) => new Date(a.date.iso).getTime() - new Date(b.date.iso).getTime()).slice(0, 4);
          setDays(filtered.length > 0 ? filtered : FALLBACK_DAYS as EnvHoliday[]);
        } else { setDays(FALLBACK_DAYS as EnvHoliday[]); }
        setLoading(false);
      }).catch(() => { setDays(FALLBACK_DAYS as EnvHoliday[]); setLoading(false); });
  }, []);
  return { days, loading };
}

// ─── "Planet Pulse" — the unified live data section ──────────────────────────
function PlanetPulse() {
  const { data: apod, loading: apodLoading } = useNasaApod();
  const { data: weather, loading: weatherLoading } = useAbuDhabiWeather();
  const { days, loading: daysLoading } = useEnvDays();
  const weatherInfo = weather ? getWeatherInfo(weather.weathercode) : null;

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Subtle background mesh */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, #064e3b 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1e3a5f 0%, transparent 60%)" }} />

      <div className="container relative z-10">

        {/* Section label */}
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Planet Pulse</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* NASA APOD — spans 7 cols, big card */}
          <div className="lg:col-span-7">
            <div className="h-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 group relative">
              {apodLoading ? (
                <div className="animate-pulse h-96 bg-slate-800" />
              ) : apod ? (
                <>
                  {/* Image fills top portion */}
                  {apod.media_type === "image" && (
                    <div className="relative h-64 overflow-hidden">
                      <img src={apod.url} alt={apod.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {/* Gradient overlay at bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                      {/* NASA badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">NASA · APOD</span>
                      </div>
                      {/* Date badge */}
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5">
                        <span className="text-[10px] font-bold text-white/60">
                          {new Date(apod.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Text content */}
                  <div className="p-6">
                    <h3 className="text-xl font-black text-white mb-3 leading-tight">{apod.title}</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-3 mb-4">
                      {apod.explanation}
                    </p>
                    <div className="flex items-center justify-between">
                      {apod.copyright && (
                        <span className="text-xs text-slate-600 font-medium">© {apod.copyright}</span>
                      )}
                      <a href="https://apod.nasa.gov" target="_blank" rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition-colors">
                        <ExternalLink size={11} /> View on NASA
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 flex items-center justify-center h-64 text-slate-600 text-sm font-medium">
                  NASA image unavailable today
                </div>
              )}
            </div>
          </div>

          {/* Right column — Weather + Env Days stacked, spans 5 cols */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Weather Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Live Weather</p>
                  <p className="text-sm font-bold text-slate-300">Abu Dhabi · Expo Venue</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Thermometer size={16} className="text-slate-400" />
                </div>
              </div>

              {weatherLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-14 bg-slate-800 rounded-2xl" />
                  <div className="h-8 bg-slate-800 rounded-xl w-2/3" />
                </div>
              ) : weather && weatherInfo ? (
                <div>
                  {/* Big temp display */}
                  <div className="flex items-end gap-3 mb-4">
                    <span className="text-5xl leading-none">{weatherInfo.emoji}</span>
                    <div>
                      <span className="text-5xl font-black text-white leading-none">{weather.temperature}°</span>
                      <span className="text-slate-500 text-lg font-bold ml-1">C</span>
                    </div>
                    <span className="ml-auto text-sm font-bold text-slate-400 pb-1">{weatherInfo.label}</span>
                  </div>
                  {/* Wind */}
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-4 py-2.5 border border-slate-700/50">
                    <Wind size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-400">Wind</span>
                    <span className="text-xs font-black text-slate-200 ml-auto">{weather.windspeed} km/h</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium mt-3">via Open-Meteo · updated live</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 font-medium">Weather unavailable</p>
              )}
            </div>

            {/* Environmental Days Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Upcoming</p>
                  <p className="text-sm font-bold text-slate-300">Environmental Days</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Leaf size={16} className="text-green-500" />
                </div>
              </div>

              {daysLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {days.map((day) => {
                    const d = new Date(day.date.iso);
                    const daysLeft = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
                    const urgent = daysLeft <= 14;
                    return (
                      <div key={day.date.iso}
                        className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 transition-colors duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{day.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${urgent
                            ? "bg-amber-900/40 text-amber-400 border border-amber-800/50"
                            : "bg-green-900/30 text-green-400 border border-green-800/40"
                          }`}>
                          {daysLeft}d
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom caption */}
        <p className="text-center text-[10px] text-slate-700 font-medium mt-8 uppercase tracking-widest">
          Data sources: NASA · Open-Meteo · Calendarific · Updated on every visit
        </p>
      </div>
    </section>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats } = trpc.projects.getStats.useQuery(undefined, {
    retry: false,
    // @ts-ignore
    onError: () => { },
  });
  const { data: categories } = trpc.categories.getAll.useQuery(undefined, {
    retry: false,
    // @ts-ignore
    onError: () => { },
  });

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" :
      user?.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";

  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      <OAuthRedirect />
      <Navigation />

      {/* 1. HERO */}
      <HeroSection />

      {/* 2. AUTH WELCOME BANNER */}
      {isAuthenticated && user && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 py-3.5 px-4">
          <div className="container flex items-center justify-center gap-3">
            <Sparkles size={15} className="text-green-200 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className="w-7 h-7 rounded-full bg-white/25 border border-white/30 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                {(user.name ?? "U").charAt(0).toUpperCase()}
              </div>
              <p className="text-white font-black text-sm">Welcome back, {firstName}!</p>
              <span className="text-green-200 text-xs font-medium hidden sm:inline">·</span>
              <p className="text-green-100 text-xs font-medium capitalize hidden sm:inline">Signed in as {user.role}</p>
            </div>
            <Sparkles size={15} className="text-green-200 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* 3. STATS BAR */}
      <section className="border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-10">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Globe, label: stats?.totalProjects ? "Projects Submitted" : "Be the first to submit!", value: stats?.totalProjects ?? 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
              { icon: Users, label: stats?.totalStudents ? "Students Participating" : "Join the movement!", value: stats?.totalStudents ?? 0, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { icon: Layers, label: "Innovation Categories", value: categories?.length ?? 4, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon size={26} className={stat.color} />
                </div>
                <div>
                  <p className={`text-4xl font-black ${stat.color} leading-none mb-1`}>{stat.value}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VALUE PROPOSITION */}
      <ValueProposition />

      {/* 5. PLANET PULSE — NASA + Weather + Env Days (unified dark section) */}
      <PlanetPulse />

      {/* 6. CATEGORY SELECTION */}
      <CategorySelection />

      {/* 7. MISSION */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-1.5 mb-6">
            <Flag size={13} className="text-green-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Our Mission</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Empowering the Next Generation of Innovators
          </h2>
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Tomorrow's Earth Expo empowers high school students to become environmental innovators and leaders. Through collaborative projects in environmental protection, sustainable communities, green innovation, and educational awareness, we inspire the next generation to design realistic solutions that raise awareness and demonstrate positive impact for a thriving planet.
          </p>
        </div>
      </section>

      {/* 8. EVENT INFO */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-4 py-1.5 mb-5">
              <CalendarDays size={13} className="text-green-600" />
              <span className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-400">Mark Your Calendar</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">The Expo is Almost Here</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 text-sm">Be part of the most awaited sustainability showcase of 2026</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: CalendarDays, color: "green", title: "Event Date", value: "May 14, 2026", sub: "Join us for the grand expo celebration", borderColor: "border-green-200 dark:border-green-800/50", iconBg: "bg-green-50 dark:bg-green-900/30", iconColor: "text-green-600" },
              { icon: MapPin, color: "blue", title: "Location", value: "Um Al-Emarat School", sub: "Abu Dhabi, United Arab Emirates", borderColor: "border-blue-200 dark:border-blue-800/50", iconBg: "bg-blue-50 dark:bg-blue-900/30", iconColor: "text-blue-600" },
            ].map(({ icon: Icon, title, value, sub, borderColor, iconBg, iconColor }) => (
              <div key={title} className={`rounded-2xl border-2 ${borderColor} bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}>
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-5`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <p className={`text-[10px] uppercase tracking-widest font-black ${iconColor} mb-3`}>{title}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{value}</p>
                <p className="text-xs text-slate-400 font-medium">{sub}</p>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-800/50 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-5">
                <Flag size={22} className="text-violet-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-violet-600 mb-5 text-center">Key Milestones</p>
              <div className="space-y-3">
                {[
                  { date: "Apr 30", label: "Submission Deadline", accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 1–10", label: "Review Period", accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 14", label: "Expo Day 🎉", accent: "text-green-600 dark:text-green-400" },
                ].map(({ date, label, accent }) => (
                  <div key={date} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
                    <span className={`text-sm font-black ${accent}`}>{date}</span>
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CTA */}
      <section className="py-28 relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-green-50 via-white to-white dark:from-green-950/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
        <div className="container text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-slate-900 dark:text-white">
            Ready to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-cyan-500">Innovate?</span>
          </h2>
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-xl mx-auto font-medium leading-relaxed">
            Join the journey of sustainability. Showcase your brilliance, vote for the best, and help us save the planet.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            {isAuthenticated ? (
              <Link href={dashboardPath}>
                <Button size="lg" className="rounded-full px-10 py-6 premium-gradient text-white text-base font-bold shadow-xl hover:scale-105 transition-transform border-none gap-2">
                  <LayoutDashboard size={18} /> Go to My Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="rounded-full px-10 py-6 premium-gradient text-white text-base font-bold shadow-xl hover:scale-105 transition-transform border-none gap-2">
                  <LogIn size={18} /> Get Started
                </Button>
              </Link>
            )}
            <Link href="/vote">
              <Button size="lg" variant="outline" className="rounded-full px-10 py-6 border-slate-200 dark:border-slate-700 text-base font-bold hover:scale-105 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800">
                Vote Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-slate-900 dark:bg-black pt-16 pb-8">
        <div className="container px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663327629652/4H46x9AiKyJYDgF5KtC5JK/tee-logo-icon-c4HyST3WbgCi982xP8aQdA.webp" alt="TEE" className="h-10 w-10 object-contain" />
                <span className="text-xl font-black tracking-tighter text-white">TEE-2026</span>
              </div>
              <p className="text-slate-400 max-w-sm font-medium text-sm leading-relaxed">
                Empowering Um Al-Emarat School students to lead the sustainability movement through innovation and creativity.
              </p>
              {isAuthenticated ? (
                <Link href={dashboardPath}>
                  <Button size="sm" variant="outline" className="rounded-full border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 mt-2">
                    <LayoutDashboard size={14} /> My Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="sm" variant="outline" className="rounded-full border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 mt-2">
                    <LogIn size={14} /> Sign In
                  </Button>
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Platform</p>
                <ul className="space-y-3">
                  {["Innovation Hub", "Journey Cinema", "Voting System", "Resources"].map(link => (
                    <li key={link}><Link href={`/${link.toLowerCase().replace(/ /g, "-")}`}><span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">{link}</span></Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Account</p>
                <ul className="space-y-3">
                  {[{ label: "Sign In", href: "/login" }, { label: "Register", href: "/signup" }, { label: "Student Dashboard", href: "/student/dashboard" }].map(({ label, href }) => (
                    <li key={label}><Link href={href}><span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">{label}</span></Link></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-[10px] uppercase tracking-[0.3em] font-bold text-slate-600">
            © 2026 Tomorrow's Earth Expo · Um Al-Emarat School · All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}