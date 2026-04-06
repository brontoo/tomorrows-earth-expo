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
  LayoutDashboard,
  LogIn,
  Globe,
  Users,
  Layers,
  CalendarDays,
  MapPin,
  Flag,
  Sparkles,
  Telescope,
  CloudSun,
  Leaf,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import NasaApodSection from "@/components/NasaApodSection";

// ─── Open-Meteo (Abu Dhabi weather) ──────────────────────────────────────────
interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

function getWeatherLabel(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear Sky", emoji: "☀️" };
  if (code <= 3) return { label: "Partly Cloudy", emoji: "⛅" };
  if (code <= 48) return { label: "Foggy", emoji: "🌫️" };
  if (code <= 67) return { label: "Rainy", emoji: "🌧️" };
  if (code <= 77) return { label: "Snowy", emoji: "❄️" };
  if (code <= 82) return { label: "Showers", emoji: "🌦️" };
  return { label: "Stormy", emoji: "⛈️" };
}

function useAbuDhabiWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Abu Dhabi: lat=24.4539, lon=54.3773
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=24.4539&longitude=54.3773&current_weather=true&timezone=Asia%2FDubai"
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.current_weather) {
          setData({
            temperature: Math.round(d.current_weather.temperature),
            windspeed: Math.round(d.current_weather.windspeed),
            weathercode: d.current_weather.weathercode,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ─── Calendarific (upcoming environmental days) ───────────────────────────────
const CALENDARIFIC_KEY = "Cf52cNSeIC66ey2TAwZFCx1x2lIlv7bH";

interface EnvHoliday {
  name: string;
  date: { iso: string };
  description: string;
}

const ENV_KEYWORDS = [
  "earth", "environment", "water", "ocean", "forest", "wildlife",
  "climate", "energy", "recycl", "sustainab", "biodiversity", "pollution",
  "ozone", "green", "ecology", "nature", "tree", "solar", "wind",
];

function useEnvDays() {
  const [days, setDays] = useState<EnvHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_KEY}&country=AE&year=${year}&type=observance`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.response?.holidays) {
          const today = new Date();
          const upcoming = (d.response.holidays as EnvHoliday[])
            .filter((h) => {
              const hDate = new Date(h.date.iso);
              if (hDate < today) return false;
              const name = h.name.toLowerCase();
              const desc = (h.description || "").toLowerCase();
              return ENV_KEYWORDS.some((kw) => name.includes(kw) || desc.includes(kw));
            })
            .sort((a, b) => new Date(a.date.iso).getTime() - new Date(b.date.iso).getTime())
            .slice(0, 4);
          setDays(upcoming);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { days, loading };
}

// ─── Weather + Env Days Section ───────────────────────────────────────────────
function LiveDataSection() {
  const { data: weather, loading: weatherLoading } = useAbuDhabiWeather();
  const { days, loading: daysLoading } = useEnvDays();
  const weatherInfo = weather ? getWeatherLabel(weather.weathercode) : null;

  return (
    <section className="py-16 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Abu Dhabi Weather Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                <CloudSun size={20} className="text-sky-600" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Live Weather</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Abu Dhabi, UAE</p>
              </div>
              <span className="ml-auto text-xs font-bold text-slate-400 bg-white/70 dark:bg-slate-800/70 rounded-full px-3 py-1 border border-slate-200 dark:border-slate-700">
                Expo Venue
              </span>
            </div>

            {weatherLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-sky-200/50 dark:bg-sky-900/30 rounded-2xl" />
                <div className="h-4 bg-sky-200/50 dark:bg-sky-900/30 rounded w-1/2" />
              </div>
            ) : weather && weatherInfo ? (
              <div>
                <div className="flex items-end gap-4 mb-4">
                  <span className="text-6xl leading-none">{weatherInfo.emoji}</span>
                  <div>
                    <p className="text-6xl font-black text-slate-900 dark:text-white leading-none">
                      {weather.temperature}°
                    </p>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Celsius</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-sky-100 dark:border-sky-900/40">
                    <p className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">Condition</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{weatherInfo.label}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-sky-100 dark:border-sky-900/40">
                    <p className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">Wind Speed</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{weather.windspeed} km/h</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-4">
                  Live data via Open-Meteo • Updated every visit
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-medium">Weather data unavailable</p>
            )}
          </div>

          {/* Upcoming Environmental Days */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Leaf size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600 dark:text-green-400">Upcoming</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Environmental Days</p>
              </div>
            </div>

            {daysLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-green-200/50 dark:bg-green-900/30 rounded-2xl" />
                ))}
              </div>
            ) : days.length > 0 ? (
              <div className="space-y-3">
                {days.map((day) => {
                  const d = new Date(day.date.iso);
                  const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return (
                    <div
                      key={day.date.iso}
                      className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-green-100 dark:border-green-900/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{day.name}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className={`ml-3 flex-shrink-0 text-xs font-black px-3 py-1 rounded-full ${daysLeft <= 7
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : daysLeft <= 30
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        }`}>
                        {daysLeft}d
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-slate-400 font-medium pt-1">
                  Data via Calendarific • {new Date().getFullYear()} calendar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { name: "World Earth Day", date: "Apr 22", days: 16 },
                  { name: "World Environment Day", date: "Jun 5", days: 60 },
                  { name: "World Oceans Day", date: "Jun 8", days: 63 },
                  { name: "World Wildlife Day", date: "Mar 3, 2027", days: 331 },
                ].map((day) => (
                  <div
                    key={day.name}
                    className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-green-100 dark:border-green-900/40"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{day.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{day.date}</p>
                    </div>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                      {day.days}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Main Home Component ──────────────────────────────────────────────────────
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
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "teacher"
        ? "/teacher/dashboard"
        : "/student/dashboard";

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
              <span className="text-green-200 text-xs font-medium hidden sm:inline"> · </span>
              <p className="text-green-100 text-xs font-medium capitalize hidden sm:inline">
                Signed in as {user.role}
              </p>
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
              {
                icon: Globe,
                label: stats?.totalProjects ? "Projects Submitted" : "Be the first to submit!",
                value: stats?.totalProjects ?? 0,
                color: "text-green-600",
                bg: "bg-green-50 dark:bg-green-900/20",
              },
              {
                icon: Users,
                label: stats?.totalStudents ? "Students Participating" : "Join the movement!",
                value: stats?.totalStudents ?? 0,
                color: "text-blue-600",
                bg: "bg-blue-50 dark:bg-blue-900/20",
              },
              {
                icon: Layers,
                label: "Innovation Categories",
                value: categories?.length ?? 4,
                color: "text-violet-600",
                bg: "bg-violet-50 dark:bg-violet-900/20",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
              >
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

      {/* 5. NASA APOD — صورة علمية يومية من الفضاء */}
      <NasaApodSection />

      {/* 6. LIVE DATA — طقس أبوظبي + الأيام البيئية */}
      <LiveDataSection />

      {/* 7. CATEGORY SELECTION */}
      <CategorySelection />

      {/* 8. MISSION */}
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
            Tomorrow's Earth Expo empowers high school students to become environmental innovators
            and leaders. Through collaborative projects in environmental protection, sustainable
            communities, green innovation, and educational awareness, we inspire the next generation
            to design realistic solutions that raise awareness and demonstrate positive impact for a
            thriving planet.
          </p>
        </div>
      </section>

      {/* 9. EVENT INFO */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-4 py-1.5 mb-5">
              <CalendarDays size={13} className="text-green-600" />
              <span className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-400">
                Mark Your Calendar
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              The Expo is Almost Here
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 text-sm">
              Be part of the most awaited sustainability showcase of 2026
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Event Date */}
            <div className="rounded-2xl border-2 border-green-200 dark:border-green-800/50 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
                <CalendarDays size={22} className="text-green-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-green-600 mb-3">Event Date</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">May 14, 2026</p>
              <p className="text-xs text-slate-400 font-medium">Join us for the grand expo celebration</p>
            </div>

            {/* Location */}
            <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800/50 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-5">
                <MapPin size={22} className="text-blue-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-blue-600 mb-3">Location</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Um Al-Emarat School</p>
              <p className="text-xs text-slate-400 font-medium">Abu Dhabi, United Arab Emirates</p>
            </div>

            {/* Key Milestones */}
            <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-800/50 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-5">
                <Flag size={22} className="text-violet-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-violet-600 mb-5 text-center">
                Key Milestones
              </p>
              <div className="space-y-3">
                {[
                  { date: "Apr 30", label: "Submission Deadline", accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 1–10", label: "Review Period", accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 14", label: "Expo Day 🎉", accent: "text-green-600 dark:text-green-400" },
                ].map(({ date, label, accent }) => (
                  <div
                    key={date}
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5"
                  >
                    <span className={`text-sm font-black ${accent}`}>{date}</span>
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CTA */}
      <section className="py-28 relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-green-50 via-white to-white dark:from-green-950/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
        <div className="container text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-slate-900 dark:text-white">
            Ready to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-cyan-500">
              Innovate?
            </span>
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

      {/* 11. FOOTER */}
      <footer className="bg-slate-900 dark:bg-black pt-16 pb-8">
        <div className="container px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/3105196633276296524/H46x9AiKyJYDgF5KtC5JKtee-logo-icon-c4HyST3WbgCi982xP8aQdA.webp"
                  alt="TEE"
                  className="h-10 w-10 object-contain"
                />
                <span className="text-xl font-black tracking-tighter text-white">TEE-2026</span>
              </div>
              <p className="text-slate-400 max-w-sm font-medium text-sm leading-relaxed">
                Empowering Um Al-Emarat School students to lead the sustainability movement through
                innovation and creativity.
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
                  {["Innovation Hub", "Journey Cinema", "Voting System", "Resources"].map((link) => (
                    <li key={link}>
                      <Link href={`/${link.toLowerCase().replace(/ /g, "-")}`}>
                        <span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">
                          {link}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Account</p>
                <ul className="space-y-3">
                  {[
                    { label: "Sign In", href: "/login" },
                    { label: "Register", href: "/signup" },
                    { label: "Student Dashboard", href: "/student/dashboard" },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href}>
                        <span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">
                          {label}
                        </span>
                      </Link>
                    </li>
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