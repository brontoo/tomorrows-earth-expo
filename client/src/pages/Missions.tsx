import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Clock3, Compass, Flame, Leaf, Sparkles, Star, Target } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

const DIFFICULTY_STARS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

function DifficultyStars({ difficulty }: { difficulty?: string }) {
  const value = DIFFICULTY_STARS[String(difficulty ?? "easy")] ?? 1;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty: ${difficulty ?? "easy"}`}>
      {[1, 2, 3].map((step) => (
        <Star
          key={step}
          className={`h-3.5 w-3.5 ${step <= value ? "text-[#00ff88]" : "text-white/20"}`}
          fill={step <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function Missions() {
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.height = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.height = "";
    };
  }, []);

  const missionsQuery = trpc.missions.getAll.useQuery();
  const missions: any[] = missionsQuery.data ?? [];
  const [zone, setZone] = useState<string>("all");

  const zones = useMemo(() => {
    const seen = new Map<string, string>();
    missions.forEach((mission) => {
      if (mission.zoneName && !seen.has(mission.zoneName)) {
        seen.set(mission.zoneName, mission.zoneIcon ?? "");
      }
    });
    return Array.from(seen.entries()).map(([name, icon]) => ({ name, icon }));
  }, [missions]);

  const visible = zone === "all" ? missions : missions.filter((mission) => mission.zoneName === zone);
  const totalPoints = missions.reduce((sum, mission) => sum + (mission.pointsAvailable ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#04100d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,#0e4133_0%,#04100d_55%)]" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[7%] top-[26%] h-2 w-2 rounded-full bg-[#00ff88]/60 animate-ping" />
        <div className="absolute right-[9%] top-[18%] h-1.5 w-1.5 rounded-full bg-[#d882ff]/70 animate-pulse" />
        <div className="absolute bottom-[18%] left-[22%] h-1.5 w-1.5 rounded-full bg-[#00ff88]/40 animate-pulse" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-[#00ff88]/20 bg-[#04100d]/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/">
              <span className="flex cursor-pointer items-center gap-2 text-sm font-black tracking-[0.18em] text-white">
                <span className="text-lg" aria-hidden="true">
                  🌍
                </span>
                TEE-2026
              </span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/eco-journey">
                <span className="cursor-pointer rounded-full border border-white/12 px-3 py-1.5 font-semibold text-emerald-50/80 transition hover:border-[#00ff88]/40 hover:text-white">
                  Eco Journey
                </span>
              </Link>
              <Link href="/my-journey">
                <span className="cursor-pointer rounded-full border border-[#00ff88]/35 bg-[#00ff88]/10 px-3 py-1.5 font-semibold text-[#00ff88] transition hover:bg-[#00ff88]/15">
                  My Journey
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          <section className="relative overflow-hidden rounded-[28px] border border-[#00ff88]/25 bg-gradient-to-br from-[#0d3529] via-[#07211b] to-[#04100d] p-7 shadow-[0_0_60px_rgba(0,255,136,0.12)] md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/70 to-transparent" />
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#00ff88]">
                  <Flame className="h-3.5 w-3.5" /> Mission board
                </span>
                <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                  Sustainability Missions
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-emerald-50/75">
                  Pick a mission, do it for real, and bring back your evidence. Every approved mission grows your Eco
                  Journey and unlocks badges.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-center">
                  <Compass className="mx-auto h-5 w-5 text-[#00ff88]" />
                  <p className="mt-2 text-2xl font-black text-[#00ff88]">{missions.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50/55">missions</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-center">
                  <Leaf className="mx-auto h-5 w-5 text-[#00ff88]" />
                  <p className="mt-2 text-2xl font-black text-[#00ff88]">{zones.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50/55">zones</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-center">
                  <Target className="mx-auto h-5 w-5 text-[#d882ff]" />
                  <p className="mt-2 text-2xl font-black text-[#d882ff]">{totalPoints}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50/55">points</p>
                </div>
              </div>
            </div>
          </section>

          {zones.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50/45">
                Filter zone
              </span>
              <button
                type="button"
                onClick={() => setZone("all")}
                className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition ${
                  zone === "all"
                    ? "border-[#00ff88]/50 bg-[#00ff88]/15 text-[#00ff88]"
                    : "border-white/12 bg-white/5 text-emerald-50/60 hover:border-[#00ff88]/35 hover:text-white"
                }`}
              >
                All
              </button>
              {zones.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setZone(item.name)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition ${
                    zone === item.name
                      ? "border-[#00ff88]/50 bg-[#00ff88]/15 text-[#00ff88]"
                      : "border-white/12 bg-white/5 text-emerald-50/60 hover:border-[#00ff88]/35 hover:text-white"
                  }`}
                >
                  {item.icon ? `${item.icon} ` : ""}
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {missionsQuery.isLoading && (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
              ))}
            </div>
          )}

          {missionsQuery.isError && (
            <div className="mt-6 rounded-[28px] border border-rose-400/30 bg-rose-400/5 p-10 text-center text-rose-200">
              Missions could not be loaded right now. Please refresh the page.
            </div>
          )}

          {!missionsQuery.isLoading && !missionsQuery.isError && missions.length === 0 && (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/15 p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#00ff88]" />
              <h2 className="mt-4 text-xl font-black">New missions are on their way</h2>
              <p className="mt-2 text-emerald-50/70">Your next learning path will appear here soon.</p>
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((mission: any) => (
              <Link key={mission.id} href={`/missions/${mission.slug}`}>
                <article className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 transition duration-300 hover:-translate-y-1.5 hover:border-[#00ff88]/50 hover:shadow-[0_0_45px_rgba(0,255,136,0.20)]">
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/60 to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/10 text-2xl">
                      {mission.zoneIcon ?? "🌿"}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-50/45">
                        {TYPE_LABELS[mission.missionType] ?? mission.missionType}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <DifficultyStars difficulty={mission.difficulty} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#00ff88]/80">
                    {mission.zoneName ?? "Sustainability"}
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight">{mission.title}</h2>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-emerald-50/70">
                    {mission.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-emerald-50/70">
                      <Clock3 className="h-4 w-4" /> {mission.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-black text-[#00ff88]">
                      <Leaf className="h-4 w-4" /> {mission.pointsAvailable} pts
                    </span>
                  </div>

                  <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#00ff88]/35 bg-[#00ff88]/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#00ff88] transition group-hover:bg-[#00ff88]/20">
                    View mission <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}