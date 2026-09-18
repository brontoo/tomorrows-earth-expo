import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Clock3, Leaf, Sparkles } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

export default function Missions() {
  const missionsQuery = trpc.missions.getAll.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-6 pb-20 pt-12 md:pt-20">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Act with purpose</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground md:text-6xl">Sustainability Missions</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">Small, meaningful steps build the knowledge and confidence to create real impact.</p>
        </section>

        {missionsQuery.isLoading && <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>}
        {missionsQuery.isError && <div className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">Missions are unavailable right now.</div>}
        {!missionsQuery.isLoading && !missionsQuery.isError && missionsQuery.data?.length === 0 && <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center"><Sparkles className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-xl font-bold">New missions are on their way</h2><p className="mt-2 text-muted-foreground">Your next learning path will appear here soon.</p></div>}

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {missionsQuery.data?.map((mission) => (
            <Link key={mission.id} href={`/missions/${mission.slug}`}>
              <article className="group flex h-full cursor-pointer flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{TYPE_LABELS[mission.missionType] ?? mission.missionType}</span>
                  <span className="text-xs font-semibold capitalize text-muted-foreground">{mission.difficulty}</span>
                </div>
                <h2 className="mt-6 text-2xl font-bold text-foreground">{mission.title}</h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{mission.description}</p>
                <div className="mt-7 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="h-4 w-4" /> {mission.estimatedMinutes} min</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-primary"><Leaf className="h-4 w-4" /> {mission.pointsAvailable} pts</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">View mission <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
