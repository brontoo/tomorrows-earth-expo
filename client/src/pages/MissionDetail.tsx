import { Link, useParams } from "wouter";
import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import treeImg from "@/assets/illustrations/tree.svg";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Leaf,
  ListChecks,
  Lock,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

const DIFFICULTY_STARS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

const STATUS_META: Record<string, { label: string; hint: string; className: string }> = {
  in_progress: {
    label: "In progress",
    hint: "You started this mission. Finish it and deliver your evidence.",
    className: "border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88]",
  },
  submitted: {
    label: "Awaiting review",
    hint: "Your teacher will review your evidence and award the points.",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  verification_required: {
    label: "Verification required",
    hint: "Your teacher needs to verify this mission.",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  revision_requested: {
    label: "Revision requested",
    hint: "Your teacher asked for another look — update your evidence and submit again.",
    className: "border-[#d882ff]/40 bg-[#d882ff]/10 text-[#d882ff]",
  },
  completed: {
    label: "Mission complete",
    hint: "Verified by your teacher. Points awarded.",
    className: "border-[#00ff88]/50 bg-[#00ff88]/15 text-[#00ff88]",
  },
  verified: {
    label: "Mission complete",
    hint: "Verified by your teacher. Points awarded.",
    className: "border-[#00ff88]/50 bg-[#00ff88]/15 text-[#00ff88]",
  },
  rejected: {
    label: "Not accepted",
    hint: "This submission was not accepted. You can talk to your teacher and try again.",
    className: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  },
};

const REWARD_STARS = [
  { icon: Target, title: "Action", text: "You did the mission in the real world." },
  { icon: FileText, title: "Evidence", text: "You recorded what you observed or measured." },
  { icon: Sparkles, title: "Reflection", text: "You explained what you learned and what changes next." },
];

function DifficultyStars({ difficulty }: { difficulty?: string }) {
  const value = DIFFICULTY_STARS[String(difficulty ?? "easy")] ?? 1;
  return (
    <span className="inline-flex items-center gap-1" title={`Difficulty: ${difficulty ?? "easy"}`}>
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

function Chip({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: "default" | "neon" | "violet";
}) {
  const tones = {
    default: "border-white/12 bg-white/5 text-emerald-50/80",
    neon: "border-[#00ff88]/35 bg-[#00ff88]/10 text-[#00ff88]",
    violet: "border-[#d882ff]/35 bg-[#d882ff]/10 text-[#d882ff]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

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

  const startMutation = trpc.missionCompletions.start.useMutation({ onSuccess: () => completionQuery.refetch() });
  const submitMutation = trpc.missionCompletions.submit.useMutation({ onSuccess: () => completionQuery.refetch() });

  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const completion = completionQuery.data;
  const canStart = Boolean(isStudent && mission && currentYearQuery.data && !completion && !startMutation.isPending);
  const canSubmit = Boolean(
    completion &&
      (completion.status === "in_progress" || completion.status === "revision_requested") &&
      !submitMutation.isPending,
  );
  const status = completion?.status ? STATUS_META[completion.status] : undefined;
  const instructions: string[] = String(mission?.instructions ?? "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sdgs: number[] = (() => {
    if (!mission?.sdgIds) return [];
    try {
      const parsed = JSON.parse(mission.sdgIds);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="min-h-screen bg-[#04100d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#0d3a2f_0%,#04100d_60%)]" />
      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#04100d]/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
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

        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
          <Link href="/missions">
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-emerald-50/80 transition hover:border-[#00ff88]/40 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to missions
            </span>
          </Link>

          {missionQuery.isLoading && (
            <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          )}

          {missionQuery.isError && (
            <div className="mt-8 rounded-3xl border border-rose-400/30 bg-rose-400/5 p-10 text-center text-rose-200">
              This mission could not be loaded. Please refresh the page.
            </div>
          )}

          {!missionQuery.isLoading && !missionQuery.isError && !mission && (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-12 text-center">
              <h1 className="text-2xl font-black">Mission not found</h1>
              <p className="mt-2 text-emerald-50/70">It may not be published yet.</p>
            </div>
          )}

          {mission && (
            <>
              {/* ============ QUEST CARD ============ */}
              <section className="mt-6 overflow-hidden rounded-[28px] border border-[#00ff88]/25 bg-gradient-to-br from-[#0b2e26] via-[#07211b] to-[#04100d] shadow-[0_0_60px_rgba(0,255,136,0.12)]">
                <div className="grid gap-8 p-7 md:grid-cols-[1fr_260px] md:p-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mission.zoneIcon ? (
                        <Chip tone="neon">
                          <span aria-hidden="true">{mission.zoneIcon}</span>
                          {mission.zoneName ?? "Sustainability"}
                        </Chip>
                      ) : (
                        <Chip tone="neon" icon={Leaf}>
                          {mission.zoneName ?? "Sustainability"}
                        </Chip>
                      )}
                      <Chip icon={Target}>{TYPE_LABELS[mission.missionType] ?? mission.missionType}</Chip>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-50/70">
                        <DifficultyStars difficulty={mission.difficulty} />
                        {mission.difficulty}
                      </span>
                    </div>

                    <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                      {mission.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-emerald-50/80">
                      {mission.description}
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
                      <Chip icon={Clock3}>{mission.estimatedMinutes} min</Chip>
                      <Chip icon={Leaf} tone="neon">
                        {mission.pointsAvailable} points
                      </Chip>
                      <Chip icon={FileText}>
                        {mission.evidenceRequired ? "Evidence required" : "No upload needed"}
                      </Chip>
                      <Chip icon={BadgeCheck}>
                        {String(mission.verificationMethod ?? "teacher_review").replaceAll("_", " ")}
                      </Chip>
                    </div>

                    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/25 bg-[#00ff88]/8 px-4 py-2 text-sm font-semibold text-emerald-50/80">
                      <span aria-hidden="true">🌳</span>
                      <span dir="rtl">بو غصن مرشدك في هذه المهمة — أنجزها لتنقذ أصدقاءه</span>
                    </div>
                  </div>

                  {/* mascot + action */}
                  <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-white/10 bg-black/25 p-6">
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00ff88]/70 shadow-[0_0_35px_rgba(0,255,136,0.35)]" />
                      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(0,255,136,0.28)_0%,rgba(4,16,13,0)_70%)]" />
                      <img src={treeImg} alt="Bu Ghosn" className="relative h-20 w-20 drop-shadow-[0_0_18px_rgba(0,255,136,0.55)]" />
                    </div>

                    {!completion &&
                      (isStudent ? (
                        <button
                          type="button"
                          disabled={!canStart}
                          onClick={() =>
                            currentYearQuery.data &&
                            startMutation.mutate({ missionId: mission.id, academicYearId: currentYearQuery.data.id })
                          }
                          className="w-full rounded-2xl bg-[#00ff88] px-5 py-3.5 text-sm font-black uppercase tracking-wide text-[#04100d] shadow-[0_0_28px_rgba(0,255,136,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {startMutation.isPending ? "Starting…" : "Start mission"}
                        </button>
                      ) : (
                        <Link href="/login">
                          <span className="block w-full cursor-pointer rounded-2xl border border-[#00ff88]/45 px-5 py-3.5 text-center text-sm font-black uppercase tracking-wide text-[#00ff88] transition hover:bg-[#00ff88]/10">
                            Sign in to start
                          </span>
                        </Link>
                      ))}

                    {status && (
                      <div className={`w-full rounded-2xl border px-4 py-3 text-center text-sm font-bold ${status.className}`}>
                        {status.label}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ============ STATUS BANNER ============ */}
              {status && (
                <section className={`mt-6 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold ${status.className}`}>
                  {completion?.status === "completed" || completion?.status === "verified" ? (
                    <Trophy className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{status.hint}</span>
                  {typeof completion?.score === "number" && (
                    <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs">
                      Score: {completion.score}/100
                    </span>
                  )}
                </section>
              )}

              {/* ============ MISSION + REWARDS ============ */}
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-[#00ff88]" />
                    <h2 className="text-xl font-black">Your mission</h2>
                  </div>
                  <ol className="mt-6 space-y-4">
                    {instructions.map((line, index) => (
                      <li key={index} className="flex gap-4">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#00ff88]/40 bg-[#00ff88]/10 text-xs font-black text-[#00ff88]">
                          {index + 1}
                        </span>
                        <p className="leading-relaxed text-emerald-50/85">{line}</p>
                      </li>
                    ))}
                    {instructions.length === 0 && (
                      <li className="text-emerald-50/70">Follow your teacher&apos;s instructions for this mission.</li>
                    )}
                  </ol>

                  {sdgs.length > 0 && (
                    <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/50">
                        Global goals
                      </span>
                      {sdgs.map((sdg) => (
                        <span
                          key={sdg}
                          className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-bold text-emerald-50/80"
                        >
                          SDG {sdg}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-[#d882ff]" />
                    <h2 className="text-xl font-black">Rewards</h2>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/8 p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00ff88]/80">
                      Points available
                    </p>
                    <p className="mt-2 text-5xl font-black text-[#00ff88]">{mission.pointsAvailable}</p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {REWARD_STARS.map((reward) => (
                      <li key={reward.title} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <reward.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#00ff88]" />
                        <div>
                          <p className="text-sm font-bold">{reward.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-emerald-50/65">{reward.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-emerald-50/65">
                    <Lock className="h-4 w-4 shrink-0 text-emerald-50/45" />
                    Repeat policy: {String(mission.repeatPolicy ?? "once").replaceAll("_", " ")}
                  </div>
                </section>
              </div>

              {/* ============ DELIVER EVIDENCE ============ */}
              {completion && (completion.status === "in_progress" || completion.status === "revision_requested") && (
                <form
                  className="mt-6 rounded-3xl border border-[#00ff88]/25 bg-gradient-to-br from-[#0b2e26]/70 to-[#04100d] p-7"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitMutation.mutate({
                      id: completion.id,
                      evidence: evidence || undefined,
                      reflection: reflection || undefined,
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-[#00ff88]" />
                    <h2 className="text-xl font-black">Deliver your evidence</h2>
                  </div>
                  <p className="mt-2 text-sm text-emerald-50/70">
                    Your submission goes to your teacher for review. Points and badges are awarded after approval.
                  </p>

                  <label className="mt-6 block text-sm font-bold text-emerald-50/85" htmlFor="mission-reflection">
                    Reflection — what did you discover, change, or create?
                  </label>
                  <textarea
                    id="mission-reflection"
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    className="mt-2 min-h-32 w-full rounded-2xl border border-white/12 bg-black/30 p-4 font-normal text-white placeholder:text-emerald-50/35 focus:border-[#00ff88]/60 focus:outline-none"
                    placeholder="Write a few sentences about what you did and what you learned."
                  />

                  <label className="mt-5 block text-sm font-bold text-emerald-50/85" htmlFor="mission-evidence">
                    Evidence note{mission.evidenceRequired && <span className="ml-1 text-rose-300">*</span>}
                  </label>
                  <textarea
                    id="mission-evidence"
                    value={evidence}
                    onChange={(event) => setEvidence(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-2xl border border-white/12 bg-black/30 p-4 font-normal text-white placeholder:text-emerald-50/35 focus:border-[#00ff88]/60 focus:outline-none"
                    placeholder="Describe your evidence or measurement (photos and files are coming soon)."
                  />

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button
                      type="submit"
                      disabled={(mission.evidenceRequired && !evidence.trim()) || !canSubmit}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#00ff88] px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#04100d] shadow-[0_0_28px_rgba(0,255,136,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Send className="h-4 w-4" />
                      {submitMutation.isPending ? "Submitting…" : "Submit for review"}
                    </button>
                    {completion.status === "revision_requested" && (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#d882ff]">
                        <RotateCcw className="h-4 w-4" /> Revision requested by your teacher
                      </span>
                    )}
                    {submitMutation.isError && (
                      <span className="text-sm font-semibold text-rose-300">
                        We couldn&apos;t submit this mission. Please try again.
                      </span>
                    )}
                  </div>
                </form>
              )}

              {/* ============ TEACHER FEEDBACK ============ */}
              {completion?.teacherFeedback && (
                <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#00ff88]" />
                    <h2 className="text-xl font-black">Teacher feedback</h2>
                  </div>
                  <p className="mt-4 whitespace-pre-line leading-relaxed text-emerald-50/85">
                    {completion.teacherFeedback}
                  </p>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}