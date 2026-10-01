import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Clock3, Leaf, Sparkles, Star, Target } from "lucide-react";

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
  const missionsQuery = trpc.missions.getAll.useQuery();
  const missions = missionsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#04100d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#0d3a2f_0%,#04100d_60%)]" />
      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#04100d]/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
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

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
          <section className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#00ff88]">
                <Sparkles className="h-3.5 w-3.5" /> Act with purpose
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                Sustainability Missions
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-emerald-50/75">
                Small, meaningful steps build the knowledge and confidence to create real impact. Complete a mission,
                deliver your evidence, and earn points for your Eco Journey.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-5">
              <Target className="h-8 w-8 text-[#00ff88]" />
              <div>
                <p className="text-3xl font-black text-[#00ff88]">{missions.length}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50/60">
                  missions available
                </p>
              </div>
            </div>
          </section>

          {missionsQuery.isLoading && (
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
              ))}
            </div>
          )}

          {missionsQuery.isError && (
            <div className="mt-10 rounded-3xl border border-rose-400/30 bg-rose-400/5 p-10 text-center text-rose-200">
              Missions could not be loaded right now. Please refresh the page.
            </div>
          )}

          {!missionsQuery.isLoading && !missionsQuery.isError && missions.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#00ff88]" />
              <h2 className="mt-4 text-xl font-black">New missions are on their way</h2>
              <p className="mt-2 text-emerald-50/70">Your next learning path will appear here soon.</p>
            </div>
          )}

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission: any) => (
              <Link key={mission.id} href={`/missions/${mission.slug}`}>
                <article className="group flex h-full cursor-pointer flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#00ff88]/45 hover:shadow-[0_0_40px_rgba(0,255,136,0.18)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#00ff88]">
                      {mission.zoneIcon ? (
                        <span aria-hidden="true">{mission.zoneIcon}</span>
                      ) : (
                        <Leaf className="h-3 w-3" />
                      )}
                      {mission.zoneName ?? "Sustainability"}
                    </span>
                    <DifficultyStars difficulty={mission.difficulty} />
                  </div>

                  <span className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-50/50">
                    {TYPE_LABELS[mission.missionType] ?? mission.missionType}
                  </span>

                  <h2 className="mt-2 text-2xl font-black leading-tight">{mission.title}</h2>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-emerald-50/70">
                    {mission.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-emerald-50/70">
                      <Clock3 className="h-4 w-4" /> {mission.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-black text-[#00ff88]">
                      <Leaf className="h-4 w-4" /> {mission.pointsAvailable} pts
                    </span>
                  </div>

                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#00ff88]">
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