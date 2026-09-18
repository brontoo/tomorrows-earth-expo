import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Compass, Droplets, Leaf, Lightbulb, Recycle, Sun, Thermometer, TreePine, Waves } from "lucide-react";

const FALLBACK_ICONS = [Droplets, Sun, Recycle, TreePine, Thermometer, Compass, Leaf, Lightbulb];

export default function Explore() {
  const zonesQuery = trpc.zones.getAll.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-6 pb-20 pt-12 md:pt-20">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 px-7 py-14 text-white shadow-xl md:px-14 md:py-20">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Explore Tomorrow&apos;s Earth</p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Find your place in a living planet.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50/80">
              Explore the sustainability zones, discover how systems connect, and choose a meaningful next step for your journey.
            </p>
          </div>
          <Waves aria-hidden="true" className="absolute -bottom-8 -right-6 h-56 w-56 text-cyan-300/20" strokeWidth={1} />
        </section>

        <section className="mt-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Sustainability zones</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Choose a direction to explore</h2>
            </div>
            <span className="hidden text-sm text-muted-foreground sm:block">Learn, act, and create impact.</span>
          </div>

          {zonesQuery.isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading zones">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          )}

          {zonesQuery.isError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
              We couldn&apos;t load the sustainability zones right now.
            </div>
          )}

          {!zonesQuery.isLoading && !zonesQuery.isError && zonesQuery.data?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <h3 className="text-xl font-bold text-foreground">Zones are being prepared</h3>
              <p className="mt-2 text-muted-foreground">The first learning paths will appear here soon.</p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {zonesQuery.data?.map((zone, index) => {
              const Icon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
              return (
                <Link key={zone.id} href={`/explore/${zone.slug}`}>
                  <article className="group relative flex min-h-56 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                    {zone.coverImage && <img src={zone.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 transition duration-500 group-hover:scale-105" />}
                    <div className="relative">
                      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {zone.icon ? <span className="text-2xl" aria-hidden="true">{zone.icon}</span> : <Icon aria-hidden="true" />}
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{zone.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{zone.description || "Discover learning, missions, and stories in this zone."}</p>
                    </div>
                    <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Explore zone <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
