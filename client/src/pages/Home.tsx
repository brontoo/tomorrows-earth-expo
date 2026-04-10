import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import DecorativeTreeSystem from "@/components/DecorativeTreeSystem";
import { Link } from "wouter";
import { OAuthRedirect } from "@/components/OAuthRedirect.tsx";
import ValueProposition from "@/components/ValueProposition";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard, LogIn, Globe, Users, Layers,
  CalendarDays, MapPin, Flag, Sparkles, Wind, Leaf, Newspaper, ExternalLink, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";

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
interface WildlifeObservation {
  id: number;
  imageUrl: string | null;
  speciesName: string;
  location: string;
  observer: string | null;
}

interface EnvironmentNewsArticle {
  title: string;
  url: string;
  source: string;
  image: string | null;
  description: string;
  publishedAt: string | null;
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

function useWildlifeObservations() {
  const query = trpc.wildlife.getObservations.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
    retry: 1,
    refetchInterval: 1000 * 60 * 2,
    refetchIntervalInBackground: true,
  });

  return {
    observations: (query.data || []) as WildlifeObservation[],
    loading: query.isLoading,
    error: query.error ? "Could not load wildlife observations." : null,
  };
}

function useEnvironmentNews() {
  const query = trpc.news.getEnvironment.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
    retry: 1,
    refetchInterval: 1000 * 60 * 5,
    refetchIntervalInBackground: true,
  });

  return {
    articles: (query.data || []) as EnvironmentNewsArticle[],
    loading: query.isLoading,
    error: query.error ? "Could not load environment news." : null,
  };
}

function formatNewsDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LiveInfoBar() {
  const { data: weather, loading: wLoading } = useAbuDhabiWeather();
  const { days, loading: dLoading } = useEnvDays();
  const { observations, loading: oLoading, error: oError } = useWildlifeObservations();
  const { articles, loading: nLoading, error: nError } = useEnvironmentNews();
  const weatherInfo = weather ? getWeatherInfo(weather.weathercode) : null;
  const upcomingDays = days.slice(0, 3);

  return (
    <div className="px-4 py-8 bg-slate-50 dark:bg-slate-900/40">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 auto-rows-fr">
          <div className="glass-card rounded-[2rem] p-6 border-white/20 shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center">
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
              <div className="space-y-3">
                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{weather.temperature}°C</p>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {weatherInfo.emoji} {weatherInfo.label}
                </p>
                <p className="text-xs font-medium text-slate-400">Wind {weather.windspeed} km/h</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Weather unavailable</p>
            )}
            <div className="mt-auto pt-5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2">
              <p className="text-xs font-semibold text-slate-500">Live from Abu Dhabi</p>
              <p className="text-xs text-slate-400">Updated in real-time from Open-Meteo</p>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-6 border-white/20 shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center">
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
              <div className="flex flex-col gap-2">
                {upcomingDays.map((day) => {
                  const dayDate = new Date(day.date.iso);
                  const daysLeft = Math.ceil((dayDate.getTime() - Date.now()) / 86400000);
                  return (
                    <div key={day.date.iso} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 p-3 flex justify-between items-start">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">{day.name}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">In {daysLeft} days</p>
                      </div>
                      <p className="text-xs font-medium text-slate-400 flex-shrink-0 ml-2">
                        {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No upcoming days</p>
            )}
          </div>
        </div>

        <div className="mt-5 glass-card rounded-[2rem] p-6 border-white/20 shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center">
              <Newspaper size={15} className="text-cyan-600" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">🌍 Environment & Sustainability News</p>
          </div>
          {nLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 overflow-hidden">
                  <div className="h-44 bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : nError ? (
            <p className="text-sm text-slate-500">{nError}</p>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {articles.map((article) => {
                const newsDate = formatNewsDate(article.publishedAt);
                return (
                  <a
                    key={article.url}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 overflow-hidden hover:border-cyan-400/40 hover:shadow-md transition-all"
                  >
                    <div className="h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {article.image ? (
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper size={20} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-base font-black text-slate-900 dark:text-white line-clamp-2 min-h-[3.5rem]">{article.title}</p>
                      <p className="text-sm text-slate-500 mt-3 line-clamp-3 min-h-[3.75rem]">{article.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="font-semibold line-clamp-1">{article.source}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {newsDate && <span>{newsDate}</span>}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No environment news available at the moment.</p>
            )}
        </div>

        <div className="mt-5 glass-card rounded-[2rem] p-6 border-white/20 shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center">
                <Sparkles size={15} className="text-green-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">🌿 Wildlife Observations</p>
            </div>
            {oLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 overflow-hidden">
                    <div className="h-56 bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="h-3 w-44 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : oError ? (
              <p className="text-sm text-slate-500">{oError}</p>
            ) : observations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {observations.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 overflow-hidden hover:border-emerald-400/40 hover:shadow-md transition-all">
                    <div className="h-56 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.speciesName} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Leaf size={22} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 min-w-0">
                      <p className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">{item.speciesName || "Unknown Species"}</p>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-1">{item.location}</p>
                      {item.observer && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-1">by {item.observer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No wildlife observations available right now.</p>
            )}
          </div>
    </div>
    </div>
  );
}

interface ExpoShowcaseCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  title: string;
  subtitle?: string;
  borderClass: string;
  iconWrapClass: string;
  labelClass: string;
  backTitle: string;
  backDescription: string;
  content?: ReactNode;
  onRequestOpen?: () => void;
  heightClassName?: string;
  hintText?: string;
}

function ExpoShowcaseCard({
  icon: Icon,
  label,
  title,
  subtitle,
  borderClass,
  iconWrapClass,
  labelClass,
  backTitle,
  backDescription,
  content,
  onRequestOpen,
  heightClassName = "h-[21.5rem]",
  hintText,
}: ExpoShowcaseCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 240, damping: 20, mass: 0.5 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 240, damping: 20, mass: 0.5 });
  const openOnly = typeof onRequestOpen === "function";

  const activateCard = () => {
    if (openOnly) {
      onRequestOpen();
      return;
    }
    setIsFlipped((value) => !value);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateYRaw.set((x - 0.5) * 18);
    rotateXRaw.set((0.5 - y) * 18);
  };

  const resetTilt = () => {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  };

  return (
    <div
      className={`${heightClassName} [perspective:1200px]`}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
    >
      <motion.div style={{ rotateX, rotateY }} className="h-full w-full">
        <motion.div
          className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
          animate={{ rotateY: openOnly ? 0 : isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onClick={activateCard}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              activateCard();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`${openOnly ? "Open card" : "Flip card"}: ${title}`}
        >
          <div
            className={`absolute inset-0 rounded-2xl border-2 ${borderClass} bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md transition-all duration-300 [backface-visibility:hidden]`}
          >
            <div className={`w-12 h-12 rounded-2xl ${iconWrapClass} flex items-center justify-center mx-auto mb-5`}>
              <Icon size={22} className={labelClass} />
            </div>
            <p className={`text-[10px] uppercase tracking-widest font-black ${labelClass} mb-3 text-center`}>{label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight text-center">{title}</p>
            {content ? (
              <div className="mt-4">{content}</div>
            ) : (
              <p className="text-xs text-slate-400 font-medium text-center">{subtitle}</p>
            )}
            <p className="text-[11px] text-slate-400 font-semibold text-center mt-5">{hintText ?? (openOnly ? "Click to open" : "Click to flip")}</p>
          </div>

          <div
            className={`absolute inset-0 rounded-2xl border-2 ${borderClass} bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-8 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center text-center`}
          >
            <p className={`text-[10px] uppercase tracking-widest font-black ${labelClass} mb-4`}>Expo Insight</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{backTitle}</p>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-4 leading-relaxed font-medium">{backDescription}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-6">Click again to return</p>
          </div>
        </motion.div>
      </motion.div>
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
  const [activeExpoCard, setActiveExpoCard] = useState<number | null>(null);
  const [expoDirection, setExpoDirection] = useState(0);

  const milestoneRows = [
    { date: "May 5", label: "Submission Deadline", accent: "text-slate-700 dark:text-slate-200" },
    { date: "May 5–15", label: "Review Period", accent: "text-slate-700 dark:text-slate-200" },
    { date: "May 20", label: "Expo Day 🎉", accent: "text-green-600 dark:text-green-400" },
  ];

  const milestoneContent = (
    <div className="space-y-3">
      {milestoneRows.map(({ date, label, accent }) => (
        <div key={date} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
          <span className={`text-sm font-black ${accent}`}>{date}</span>
          <span className="text-xs font-semibold text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );

  const expoCards: ExpoShowcaseCardProps[] = [
    {
      icon: CalendarDays,
      label: "Event Date",
      title: "May 20, 2026",
      subtitle: "Join us for the grand expo celebration",
      borderClass: "border-green-200 dark:border-green-800/50",
      iconWrapClass: "bg-green-50 dark:bg-green-900/30",
      labelClass: "text-green-600",
      backTitle: "One Day, Big Impact",
      backDescription: "Expo day is where ideas move from presentation to real-world influence through community feedback and celebration.",
    },
    {
      icon: MapPin,
      label: "Location",
      title: "Um Al-Emarat School",
      subtitle: "Abu Dhabi, United Arab Emirates",
      borderClass: "border-blue-200 dark:border-blue-800/50",
      iconWrapClass: "bg-blue-50 dark:bg-blue-900/30",
      labelClass: "text-blue-600",
      backTitle: "In the Heart of Abu Dhabi",
      backDescription: "A collaborative campus setting designed for student innovation, public engagement, and sustainability storytelling.",
    },
    {
      icon: Flag,
      label: "Key Milestones",
      title: "May Timeline",
      borderClass: "border-violet-200 dark:border-violet-800/50",
      iconWrapClass: "bg-violet-50 dark:bg-violet-900/30",
      labelClass: "text-violet-600",
      backTitle: "Structured to Support Excellence",
      backDescription: "Each stage gives students time to refine ideas, receive review input, and present confident solutions on expo day.",
      content: milestoneContent,
    },
  ];

  const openExpoModal = (index: number) => {
    setExpoDirection(0);
    setActiveExpoCard(index);
  };

  const closeExpoModal = () => {
    setActiveExpoCard(null);
  };

  const showNextExpoCard = () => {
    setExpoDirection(1);
    setActiveExpoCard((current) => {
      if (current === null) return 0;
      return (current + 1) % expoCards.length;
    });
  };

  const showPrevExpoCard = () => {
    setExpoDirection(-1);
    setActiveExpoCard((current) => {
      if (current === null) return 0;
      return (current - 1 + expoCards.length) % expoCards.length;
    });
  };

  useEffect(() => {
    if (activeExpoCard === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeExpoModal();
      if (event.key === "ArrowRight") showNextExpoCard();
      if (event.key === "ArrowLeft") showPrevExpoCard();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeExpoCard]);

  return (
    <div className="relative isolate min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(1200px 520px at 50% -10%, rgba(16,185,129,0.12), transparent 60%), radial-gradient(900px 420px at 10% 32%, rgba(59,130,246,0.08), transparent 60%), radial-gradient(900px 420px at 90% 42%, rgba(14,165,233,0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-12%] top-[16%] h-[28rem] w-[28rem] rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[38%] h-[24rem] w-[24rem] rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-900/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[34%] top-[62%] h-[22rem] w-[22rem] rounded-full bg-lime-100/40 blur-3xl dark:bg-lime-900/10"
      />
      <DecorativeTreeSystem
        startDate="2026-01-01T00:00:00+04:00"
        endDate="2026-05-20T09:00:00+04:00"
      />
      <div className="relative z-10">
      <OAuthRedirect />
      <Navigation reserveSpace={false} />

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

      {/* 4. EVENT INFO */}
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
            {expoCards.map((card, index) => (
              <ExpoShowcaseCard
                key={card.label}
                {...card}
                onRequestOpen={() => openExpoModal(index)}
                hintText="Click to open"
              />
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {activeExpoCard !== null && (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExpoModal}
          >
            <div className="h-full w-full flex items-center justify-center">
              <motion.div
                className="relative w-full max-w-xl"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeExpoModal}
                  className="absolute -top-14 right-0 md:-right-1 h-11 w-11 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>

                <button
                  type="button"
                  onClick={showPrevExpoCard}
                  className="absolute left-0 -translate-x-[85%] top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors items-center justify-center"
                  aria-label="Previous card"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={showNextExpoCard}
                  className="absolute right-0 translate-x-[85%] top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors items-center justify-center"
                  aria-label="Next card"
                >
                  <ChevronRight size={20} />
                </button>

                <AnimatePresence custom={expoDirection} mode="wait">
                  <motion.div
                    key={activeExpoCard}
                    custom={expoDirection}
                    variants={{
                      enter: (direction: number) => ({ x: direction >= 0 ? 120 : -120, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (direction: number) => ({ x: direction >= 0 ? -120 : 120, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ExpoShowcaseCard
                      {...expoCards[activeExpoCard]}
                      heightClassName="h-[24rem] sm:h-[26rem] md:h-[28rem]"
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 flex md:hidden items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={showPrevExpoCard}
                    className="h-10 px-4 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={showNextExpoCard}
                    className="h-10 px-4 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center gap-1.5"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. VALUE PROPOSITION */}
      <ValueProposition />

      {/* 6. LIVE INFO CARDS */}
      <LiveInfoBar />

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
    </div>
  );
}
