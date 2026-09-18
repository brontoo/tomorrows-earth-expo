import { Link, useParams } from "wouter";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock3, Leaf } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

export default function MissionDetail() {
  const { id: slug } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthContext();
  const isStudent = isAuthenticated && user?.role === "student";
  const missionQuery = trpc.missions.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: Boolean(slug) });
  const currentYearQuery = trpc.academicYears.getCurrent.useQuery();
  const mission = missionQuery.data;
  const completionQuery = trpc.missionCompletions.getMine.useQuery(
    { missionId: mission?.id ?? 0, academicYearId: currentYearQuery.data?.id ?? 0 },
    { enabled: Boolean(mission?.id && currentYearQuery.data?.id && isStudent) },
  );
  const startMutation = trpc.missionCompletions.start.useMutation({
    onSuccess: () => completionQuery.refetch(),
  });
  const submitMutation = trpc.missionCompletions.submit.useMutation({
    onSuccess: () => completionQuery.refetch(),
  });
  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const completion = completionQuery.data;
  const canStart = Boolean(isStudent && mission && currentYearQuery.data && !completion && !startMutation.isPending);
  const canSubmit = Boolean(completion && (completion.status === "in_progress" || completion.status === "revision_requested") && !submitMutation.isPending);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container max-w-4xl px-6 pb-20 pt-12 md:pt-20">
        <Link href="/missions"><span className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to missions</span></Link>
        {missionQuery.isLoading && <div className="mt-10 h-96 animate-pulse rounded-3xl bg-muted" />}
        {missionQuery.isError && <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">This mission could not be loaded.</div>}
        {!missionQuery.isLoading && !missionQuery.isError && !mission && <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><h1 className="text-2xl font-bold">Mission not found</h1><p className="mt-2 text-muted-foreground">It may not be published yet.</p></div>}
        {mission && <article className="mt-10">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-8 text-white shadow-xl md:p-12">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">{TYPE_LABELS[mission.missionType] ?? mission.missionType}</span>
            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">{mission.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50/80">{mission.description}</p>
            <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-cyan-100"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> {mission.estimatedMinutes} minutes</span><span className="inline-flex items-center gap-2"><Leaf className="h-4 w-4" /> {mission.pointsAvailable} points available</span></div>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-[1fr_280px]">
            <section className="rounded-2xl border border-border bg-card p-7"><h2 className="text-xl font-bold">Your mission</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{mission.instructions}</p></section>
            <aside className="h-fit rounded-2xl border border-border bg-card p-7"><h2 className="font-bold">Before you begin</h2><ul className="mt-5 space-y-4 text-sm text-muted-foreground"><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />This mission is {mission.evidenceRequired ? "evidence-based" : "designed to start without an upload"}.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />Verification: {mission.verificationMethod.replaceAll("_", " ")}.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />Repeat policy: {mission.repeatPolicy.replaceAll("_", " ")}.</li></ul>
              {!completion && (isStudent ? <button type="button" disabled={!canStart} onClick={() => currentYearQuery.data && startMutation.mutate({ missionId: mission.id, academicYearId: currentYearQuery.data.id })} className="mt-7 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{startMutation.isPending ? "Starting..." : "Start mission"}</button> : <Link href="/login"><span className="mt-7 block cursor-pointer rounded-xl border border-primary/30 px-4 py-3 text-center text-sm font-bold text-primary">Sign in to start</span></Link>)}
              {completion && <div className="mt-7 rounded-xl bg-primary/10 p-4 text-sm"><p className="font-bold text-primary">Status: {completion.status.replaceAll("_", " ")}</p><p className="mt-1 text-muted-foreground">Your progress is saved to this academic year.</p></div>}
            </aside>
          </div>
          {completion && (completion.status === "in_progress" || completion.status === "revision_requested") && <form className="mt-8 rounded-2xl border border-border bg-card p-7" onSubmit={(event) => { event.preventDefault(); submitMutation.mutate({ id: completion.id, evidence: evidence || undefined, reflection: reflection || undefined }); }}><h2 className="text-xl font-bold">Complete this mission</h2><p className="mt-2 text-sm text-muted-foreground">Share what you learned or did. Your submission may require teacher verification.</p><label className="mt-6 block text-sm font-semibold" htmlFor="mission-reflection">Reflection<textarea id="mission-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="What did you discover, change, or create?" /></label><label className="mt-5 block text-sm font-semibold" htmlFor="mission-evidence">Evidence note{mission.evidenceRequired && <span className="ml-1 text-destructive">*</span>}<textarea id="mission-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="Describe your evidence or measurement. File uploads will be added next." /></label><button type="submit" disabled={mission.evidenceRequired && !evidence.trim()} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{submitMutation.isPending ? "Submitting..." : "Submit for review"}</button>{submitMutation.isError && <p className="mt-3 text-sm text-destructive">We couldn&apos;t submit this mission. Please try again.</p>}</form>}
        </article>}
      </main>
    </div>
  );
}
