import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Droplets, Leaf, Recycle, Zap } from "lucide-react";

const ICONS = [Droplets, Zap, Recycle, Leaf];
const LABELS: Record<string, string> = {
  water_liters: "Water conserved",
  electricity_kwh: "Energy reduced",
  waste_kg: "Waste diverted",
  recycling_kg: "Recycling recorded",
  plastic_items: "Plastic items avoided",
  plants_added: "Plants added",
  trees_added: "Trees added",
  food_waste_kg: "Food waste reduced",
  transport_km: "Lower-impact travel",
  custom: "Community impact",
};

export default function Impact() {
  const summaryQuery = trpc.impact.getSchoolSummary.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-6 pb-20 pt-12 md:pt-20">
        <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-8 text-white shadow-xl md:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Verified school impact</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Our Impact</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50/80">A clear view of the sustainability actions our community has measured and verified. Every number has a source, a unit, and a review status.</p>
        </section>

        {summaryQuery.isLoading && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div>}
        {summaryQuery.isError && <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">Impact data could not be loaded.</div>}
        {!summaryQuery.isLoading && !summaryQuery.isError && summaryQuery.data?.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><h2 className="text-xl font-bold">Impact tracking is just beginning</h2><p className="mt-2 text-muted-foreground">Verified measurements will appear here as teachers review them.</p></div>}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{summaryQuery.data?.map((item, index) => { const Icon = ICONS[index % ICONS.length]; return <article key={`${item.metricType}-${item.unit}`} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div><p className="mt-7 text-sm font-semibold text-muted-foreground">{item.metricLabel || LABELS[item.metricType] || item.metricType}</p><p className="mt-2 text-4xl font-black text-foreground">{item.total ?? 0}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">{item.unit} · verified</p></article>; })}</section>
      </main>
    </div>
  );
}
