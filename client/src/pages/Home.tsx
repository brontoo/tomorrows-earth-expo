import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Link } from "wouter";
import { OAuthRedirect } from "@/components/OAuthRedirect.tsx";
import ValueProposition from "@/components/ValueProposition";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard, LogIn, Globe, Users, Layers,
  CalendarDays, MapPin, Flag, Sparkles, Wind, Leaf,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Weather hook (Abu Dhabi via Open-Meteo) ──────────────────────────────────
interface WeatherData { temperature: number; windspeed: number; weathercode: number; }

function getWeatherInfo(code: number) {
  if (code === 0)  return { label: "Clear Sky",     emoji: "☀️" };
  if (code <= 3)   return { label: "Partly Cloudy", emoji: "⛅" };
  if (code <= 48)  return { label: "Foggy",         emoji: "🌫️" };
  if (code <= 67)  return { label: "Rainy",         emoji: "🌧️" };
  if (code <= 77)  return { label: "Snowy",         emoji: "❄️" };
  if (code <= 82)  return { label: "Showers",       emoji: "🌦️" };
  return                  { label: "Stormy",         emoji: "⛈️" };
}

function useAbuDhabiWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=24.4539&longitude=54.3773&current_weather=true&timezone=Asia%2FDubai",
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(d => {
        if (d.current_weather) setData({
          temperature: Math.round(d.current_weather.temperature),
          windspeed:   Math.round(d.current_weather.windspeed),
          weathercode: d.current_weather.weathercode,
        });
      })
      .catch(() => {}) // فشل الـ API لا يؤثر على الصفحة
      .finally(() => { clearTimeout(timeout); setLoading(false); });

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);
  return { data, loading };
}

// ─── Environmental Days hook ──────────────────────────────────────────────────
interface EnvDay { name: string; date: { iso: string }; }
interface NasaApodLite {
  title: string;
  url: string;
  hdurl?: string;
  media_type: string;
  thumbnail_url?: string;
  date?: string;
  explanation?: string;
}

const ENV_KEYWORDS = [
  "earth", "environment", "water", "ocean", "forest", "wildlife",
  "climate", "energy", "recycl", "sustainab", "biodiversity",
  "ozone", "green", "ecology", "nature", "tree", "solar", "wind",
];

// Fixed fallback — all dates in the future from today (Apr 2026)
const FALLBACK_DAYS: EnvDay[] = [
  { name: "World Earth Day",        date: { iso: "2026-04-22" } },
  { name: "World Environment Day",  date: { iso: "2026-06-05" } },
  { name: "World Oceans Day",       date: { iso: "2026-06-08" } },
  { name: "World Wildlife Day",     date: { iso: "2027-03-03" } },
];

function useEnvDays() {
  const [days, setDays] = useState<EnvDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CALENDARIFIC_KEY = "Cf52cNSeIC66ey2TAwZFCx1x2lIlv7bH";
    const year = new Date().getFullYear();
    // Use today at midnight (UTC+4 Abu Dhabi) as the cutoff
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_KEY}&country=AE&year=${year}&type=observance`
    )
      .then(r => r.json())
      .then(d => {
        if (d.response?.holidays) {
          const filtered = (d.response.holidays as EnvDay[])
            .filter(h => {
              const hDate = new Date(h.date.iso);
              hDate.setHours(0, 0, 0, 0);
              // strictly after today
              if (hDate <= today) return false;
              return ENV_KEYWORDS.some(kw =>
                h.name.toLowerCase().includes(kw)
              );
            })
            .sort((a, b) =>
              new Date(a.date.iso).getTime() - new Date(b.date.iso).getTime()
            )
            .slice(0, 3);

          setDays(filtered.length > 0 ? filtered : FALLBACK_DAYS.filter(d => new Date(d.date.iso) > today).slice(0, 3));
        } else {
          setDays(FALLBACK_DAYS.filter(d => new Date(d.date.iso) > today).slice(0, 3));
        }
        setLoading(false);
      })
      .catch(() => {
        const today = new Date();
        setDays(FALLBACK_DAYS.filter(d => new Date(d.date.iso) > today).slice(0, 3));
        setLoading(false);
      });
  }, []);

  return { days, loading };
}

function useNasaPreview() {
  const [data, setData] = useState<NasaApodLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch("https://api.nasa.gov/planetary/apod?api_key=opzhq4SjSKyje1q0JqjgajekWW7OahVvKqvNItZe&thumbs=true", {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then((d: NasaApodLite) => setData(d))
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return { data, loading };
}

// ─── Live Info Bar (shown only when authenticated) ────────────────────────────
function LiveInfoBar() {
  const { data: weather, loading: wLoading } = useAbuDhabiWeather();
  const { days, loading: dLoading } = useEnvDays();
  const { data: nasa, loading: nLoading } = useNasaPreview();
  const weatherInfo = weather ? getWeatherInfo(weather.weathercode) : null;
  const nasaImage = nasa?.media_type === "image" ? (nasa.hdurl || nasa.url) : nasa?.thumbnail_url;
  const upcomingDays = days.slice(0, 3);

  return (
    <div className="px-4 py-8 bg-slate-50 dark:bg-slate-900/40">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-[2.5rem] p-8 min-h-[420px] border-white/20 shadow-2xl hover:scale-[1.03] hover:-translate-y-2 transition-all duration-500">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center">
                <Wind size={15} className="text-green-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Abu Dhabi Weather</p>
            </div>
            {wLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : weather && weatherInfo ? (
              <>
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{weather.temperature}°C</p>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2">
                  {weatherInfo.emoji} {weatherInfo.label}
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1">Wind {weather.windspeed} km/h</p>
                <div className="mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Live from Abu Dhabi</p>
                  <p className="text-xs text-slate-400">Updated in real-time from Open-Meteo</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Weather unavailable</p>
            )}
          </div>

          <div className="glass-card rounded-[2.5rem] p-8 min-h-[420px] border-white/20 shadow-2xl hover:scale-[1.03] hover:-translate-y-2 transition-all duration-500">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center">
                <Leaf size={15} className="text-emerald-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Upcoming Environmental Days</p>
            </div>
            {dLoading ? (
              <div className="space-y-2">
                <div className="h-5 w-44 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : upcomingDays.length > 0 ? (
              <div className="space-y-3">
                {upcomingDays.map((day) => {
                  const dayDate = new Date(day.date.iso);
                  const daysLeft = Math.ceil((dayDate.getTime() - Date.now()) / 86400000);
                  return (
                    <div key={day.date.iso} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 p-3">
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">{day.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-semibold text-slate-500">In {daysLeft} days</p>
                        <p className="text-xs font-medium text-slate-400">
                          {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No upcoming days</p>
            )}
          </div>

          <div className="glass-card rounded-[2.5rem] min-h-[420px] border-white/20 shadow-2xl hover:scale-[1.03] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            {nLoading ? (
              <div className="h-full p-8">
                <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800 animate-pulse mt-3" />
              </div>
            ) : nasaImage ? (
              <>
                <img src={nasaImage} alt={nasa?.title || "NASA APOD"} className="w-full h-44 object-cover" loading="lazy" />
                <div className="p-6">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">NASA APOD</p>
                  <p className="text-base font-black text-slate-900 dark:text-white leading-tight line-clamp-2 mb-2">
                    {nasa?.title || "Astronomy Picture of the Day"}
                  </p>
                  {nasa?.date && (
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      {new Date(nasa.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {nasa?.explanation || "Daily image and story from NASA Astronomy Picture of the Day."}
                  </p>
                  <a
                    href={nasa?.hdurl || nasa?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex mt-3 text-xs font-bold text-cyan-600 hover:text-cyan-500 transition-colors"
                  >
                    View Full Image
                  </a>
                </div>
              </>
            ) : (
              <div className="h-full p-8 flex items-center">
                <p className="text-sm text-slate-500">NASA image unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats } = trpc.projects.getStats.useQuery(undefined, {
    retry: false,
    // @ts-ignore
    onError: () => {},
  });
  const { data: categories } = trpc.categories.getAll.useQuery(undefined, {
    retry: false,
    // @ts-ignore
    onError: () => {},
  });

  const dashboardPath =
    user?.role === "admin"   ? "/admin/dashboard"   :
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
        <div className="bg-gradient-to-r from-green-600 to-emerald-500">
          {/* Welcome row */}
          <div className="px-4 py-3.5">
            <div className="container flex items-center justify-center gap-3">
              <Sparkles size={15} className="text-green-200 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="w-7 h-7 rounded-full bg-white/25 border border-white/30 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                  {(user.name ?? "U").charAt(0).toUpperCase()}
                </div>
                <p className="text-white font-black text-sm">Welcome back, {firstName}!</p>
                <span className="text-green-200 text-xs font-medium hidden sm:inline">·</span>
                <p className="text-green-100 text-xs font-medium capitalize hidden sm:inline">
                  Signed in as {user.role}
                </p>
              </div>
              <Sparkles size={15} className="text-green-200 flex-shrink-0" />
            </div>
          </div>

        </div>
      )}

      {/* 3. STATS BAR */}
      <section className="border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-10">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Globe,  label: stats?.totalProjects ? "Projects Submitted" : "Be the first to submit!", value: stats?.totalProjects ?? 0, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
              { icon: Users,  label: stats?.totalStudents ? "Students Participating" : "Join the movement!",   value: stats?.totalStudents ?? 0, color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
              { icon: Layers, label: "Innovation Categories",                                                   value: categories?.length ?? 4,   color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
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

      {/* 4. LIVE INFO CARDS */}
      <LiveInfoBar />

      {/* 5. VALUE PROPOSITION */}
      <ValueProposition />

      {/* 6. MISSION */}
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

      {/* 7. EVENT INFO */}
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
            <div className="rounded-2xl border-2 border-green-200 dark:border-green-800/50 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
                <CalendarDays size={22} className="text-green-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-green-600 mb-3">Event Date</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">May 14, 2026</p>
              <p className="text-xs text-slate-400 font-medium">Join us for the grand expo celebration</p>
            </div>
            <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800/50 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-5">
                <MapPin size={22} className="text-blue-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-blue-600 mb-3">Location</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Um Al-Emarat School</p>
              <p className="text-xs text-slate-400 font-medium">Abu Dhabi, United Arab Emirates</p>
            </div>
            <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-800/50 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-5">
                <Flag size={22} className="text-violet-600" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-violet-600 mb-5 text-center">Key Milestones</p>
              <div className="space-y-3">
                {[
                  { date: "Apr 30",   label: "Submission Deadline", accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 1–10", label: "Review Period",       accent: "text-slate-700 dark:text-slate-200" },
                  { date: "May 14",   label: "Expo Day 🎉",         accent: "text-green-600 dark:text-green-400" },
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

      {/* 8. CTA */}
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

      {/* 9. FOOTER */}
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
                    <li key={link}>
                      <Link href={`/${link.toLowerCase().replace(/ /g, "-")}`}>
                        <span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">{link}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Account</p>
                <ul className="space-y-3">
                  {[{ label: "Sign In", href: "/login" }, { label: "Register", href: "/signup" }, { label: "Student Dashboard", href: "/student/dashboard" }].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href}>
                        <span className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">{label}</span>
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
