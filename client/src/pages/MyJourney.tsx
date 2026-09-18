import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Award, CheckCircle2, Leaf, LockKeyhole, Target } from "lucide-react";

export default function MyJourney({ embedded = false }: { embedded?: boolean }) {
  const passportQuery = trpc.passport.getMine.useQuery();
  const passport = passportQuery.data;
  const currentLevel = passport?.currentLevel;
  const nextLevel = passport?.nextLevel;
  const currentStart = currentLevel?.minPoints ?? 0;
  const nextTarget = nextLevel?.minPoints ?? Math.max(currentStart + 1, (passport?.totalPoints ?? 0) + 1);
  const progress = Math.min(100, Math.max(0, (((passport?.totalPoints ?? 0) - currentStart) / Math.max(1, nextTarget - currentStart)) * 100));

  return (
    <div className={embedded ? "bg-transparent" : "min-h-screen bg-background"}>
      {!embedded && <Navigation />}
      <main className={embedded ? "w-full" : "container px-6 pb-20 pt-12 md:pt-20"}>
        <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-8 text-white shadow-xl md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Your sustainability journey</p>
          <div className="mt-5 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div><h1 className="text-4xl font-black tracking-tight md:text-6xl">My Journey</h1><p className="mt-4 text-emerald-50/80">Learn. Explore. Act. Create Impact.</p></div>
            {passport?.academicYear && <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm"><p className="text-cyan-100/70">Academic year</p><p className="mt-1 font-bold">{passport.academicYear.label}</p></div>}
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-[1fr_280px] md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wide text-cyan-100/70">Sustainability points</p><p className="mt-1 text-6xl font-black">{passport?.totalPoints ?? 0}</p><div className="mt-6 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-sm text-emerald-50/75">{nextLevel ? `${nextLevel.minPoints - (passport?.totalPoints ?? 0)} points until ${nextLevel.name}` : "You have reached the highest configured level."}</p></div><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-cyan-100/70">Current level</p><p className="mt-2 text-2xl font-black">{currentLevel?.icon || "🌱"} {currentLevel?.name || "Seed"}</p><p className="mt-2 text-sm text-emerald-50/75">{currentLevel?.description || "Your journey starts with one meaningful step."}</p></div></div>
        </section>

        {passportQuery.isLoading && <div className="mt-10 grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-muted" />)}</div>}
        {passportQuery.isError && <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">Your passport could not be loaded. Please sign in as a student.</div>}

        {passport && <><section className="mt-12 grid gap-5 md:grid-cols-3"><article className="rounded-2xl border border-border bg-card p-6"><Target className="h-7 w-7 text-primary" /><p className="mt-6 text-sm text-muted-foreground">Missions completed</p><p className="mt-1 text-4xl font-black text-foreground">{passport.completedMissions}</p></article><article className="rounded-2xl border border-border bg-card p-6"><Award className="h-7 w-7 text-primary" /><p className="mt-6 text-sm text-muted-foreground">Badges earned</p><p className="mt-1 text-4xl font-black text-foreground">{passport.badges.filter((item) => item.earnedAt).length}</p></article><article className="rounded-2xl border border-border bg-card p-6"><Leaf className="h-7 w-7 text-primary" /><p className="mt-6 text-sm text-muted-foreground">Recent point events</p><p className="mt-1 text-4xl font-black text-foreground">{passport.recentEvents.length}</p></article></section><section className="mt-12"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Achievements</p><h2 className="mt-2 text-3xl font-black">Your badges</h2></div><ArrowUpRight className="h-6 w-6 text-muted-foreground" /></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{passport.badges.map((item) => <article key={item.badge.id} className={`rounded-2xl border p-6 ${item.earnedAt ? "border-primary/40 bg-primary/5" : "border-border bg-card opacity-70"}`}><div className="flex items-start justify-between"><span className="text-3xl" aria-hidden="true">{item.badge.icon || "🏅"}</span>{item.earnedAt ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <LockKeyhole className="h-5 w-5 text-muted-foreground" />}</div><h3 className="mt-5 text-lg font-bold">{item.badge.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.badge.description}</p>{item.earnedAt && <p className="mt-4 text-xs font-semibold text-primary">Earned this academic year</p>}</article>)}</div></section></>}
      </main>
    </div>
  );
}
