import { useState } from "react";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, Clock3, FileText, MessageSquare, XCircle } from "lucide-react";

export default function MissionVerification() {
  const queueQuery = trpc.teachers.getMissionVerificationQueue.useQuery();
  const reviewMutation = trpc.teachers.reviewMissionCompletion.useMutation({
    onSuccess: () => queueQuery.refetch(),
  });
  const [feedbackById, setFeedbackById] = useState<Record<number, string>>({});
  const [scoreById, setScoreById] = useState<Record<number, string>>({});

  const review = (completionId: number, decision: "approve" | "request_revision" | "reject") => {
    const score = scoreById[completionId];
    reviewMutation.mutate({
      completionId,
      decision,
      feedback: feedbackById[completionId] || undefined,
      score: score ? Number(score) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-6 pb-20 pt-12 md:pt-20">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Teacher Hub</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground md:text-6xl">Mission Verification</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Review student evidence carefully. Approval is what makes the completion verified and awards the configured points.</p>
        </section>

        {queueQuery.isLoading && <div className="mt-12 space-y-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>}
        {queueQuery.isError && <div className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">The verification queue could not be loaded. Please sign in as an approved teacher.</div>}
        {!queueQuery.isLoading && !queueQuery.isError && queueQuery.data?.length === 0 && <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center"><ClipboardCheck className="mx-auto h-9 w-9 text-primary" /><h2 className="mt-4 text-xl font-bold">Queue is clear</h2><p className="mt-2 text-muted-foreground">There are no mission submissions waiting for review.</p></div>}

        <div className="mt-12 space-y-5">
          {queueQuery.data?.map((item) => {
            const completion = item.completion;
            return <article key={completion.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Awaiting review</span><span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> {item.missionPoints} points</span></div><h2 className="mt-4 text-2xl font-bold text-foreground">{item.missionTitle}</h2><p className="mt-1 text-sm text-muted-foreground">Student: {item.studentName || item.studentEmail}</p></div><FileText className="h-8 w-8 text-primary" aria-hidden="true" /></div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="rounded-xl bg-muted/50 p-5"><h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Reflection</h3><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{completion.reflection || "No reflection provided."}</p></div><div className="rounded-xl bg-muted/50 p-5"><h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Evidence note</h3><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{completion.evidence || "No evidence note provided."}</p></div></div>
              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_120px]"><label className="text-sm font-semibold" htmlFor={`feedback-${completion.id}`}><span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Feedback</span><textarea id={`feedback-${completion.id}`} value={feedbackById[completion.id] || ""} onChange={(event) => setFeedbackById((current) => ({ ...current, [completion.id]: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="Give specific, useful feedback." /></label><label className="text-sm font-semibold" htmlFor={`score-${completion.id}`}>Score<input id={`score-${completion.id}`} type="number" min="0" max="100" value={scoreById[completion.id] || ""} onChange={(event) => setScoreById((current) => ({ ...current, [completion.id]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" placeholder="0-100" /></label></div>
              <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => review(completion.id, "approve")} disabled={reviewMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Approve & award points</button><button type="button" onClick={() => review(completion.id, "request_revision")} disabled={reviewMutation.isPending} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 px-4 py-3 text-sm font-bold text-amber-700 disabled:opacity-50 dark:text-amber-300">Request revision</button><button type="button" onClick={() => review(completion.id, "reject")} disabled={reviewMutation.isPending} className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive disabled:opacity-50"><XCircle className="h-4 w-4" /> Reject</button></div>
            </article>;
          })}
        </div>
      </main>
    </div>
  );
}
