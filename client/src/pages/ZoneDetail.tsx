import { Link, useParams } from "wouter";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Clock3, Leaf, Sparkles } from "lucide-react";

const TYPE_LABELS: Record<string, string> = { learn: "Learn", investigate: "Investigate", act: "Act", experience: "Experience", collaborate: "Collaborate", create: "Create" };

export default function ZoneDetail() {
  const { categorySlug: slug } = useParams<{ categorySlug: string }>();
  const zoneQuery = trpc.zones.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: Boolean(slug) });
  const missionsQuery = trpc.missions.getAll.useQuery(undefined, { enabled: Boolean(zoneQuery.data?.id) });
  const missions = missionsQuery.data?.filter((mission) => mission.zoneId === zoneQuery.data?.id) ?? [];
  const zone = zoneQuery.data;

  return <div className="min-h-screen bg-background"><Navigation /><main className="container px-6 pb-20 pt-12 md:pt-20">
    <Link href="/explore"><span className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Explore</span></Link>
    {zoneQuery.isLoading && <div className="mt-8 h-72 animate-pulse rounded-3xl bg-muted" />}
    {zoneQuery.isError && <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">This zone could not be loaded.</div>}
    {!zoneQuery.isLoading && !zoneQuery.isError && !zone && <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center"><h1 className="text-2xl font-bold">Zone not found</h1><p className="mt-2 text-muted-foreground">This learning path may not be active.</p></div>}
    {zone && <><section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-8 text-white shadow-xl md:p-14"><span className="text-5xl" aria-hidden="true">{zone.icon || "🌍"}</span><p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Sustainability zone</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{zone.name}</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50/80">{zone.description || "Explore learning, missions, stories, and experiences connected to this zone."}</p></section><section className="mt-12"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Take action</p><h2 className="mt-2 text-3xl font-black">Missions in this zone</h2></div><Leaf className="h-7 w-7 text-primary" /></div>{missionsQuery.isLoading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />}{!missionsQuery.isLoading && missions.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center"><Sparkles className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-semibold">New missions are being prepared for this zone.</p></div>}<div className="mt-6 grid gap-5 md:grid-cols-2">{missions.map((mission) => <Link key={mission.id} href={`/missions/${mission.slug}`}><article className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{TYPE_LABELS[mission.missionType] || mission.missionType}</span><span className="text-sm font-semibold text-primary">{mission.pointsAvailable} pts</span></div><h3 className="mt-5 text-xl font-bold">{mission.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{mission.description}</p><div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{mission.estimatedMinutes} min</span><span className="inline-flex items-center gap-2 font-semibold text-primary">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div></article></Link>)}</div></section></>}
  </main></div>;
}
