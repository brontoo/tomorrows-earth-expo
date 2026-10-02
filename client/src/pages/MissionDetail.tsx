import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import "@/lib/journalTheme.css";
import { journalSfx, typewriter, stampIn } from "@/lib/journalMotion";
import buGhosn from "@/assets/illustrations/tree.svg";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

const STARS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

const STATUS: Record<string, { label: string; hint: string }> = {
  in_progress: { label: "In progress", hint: "Finish the mission and bring back your evidence." },
  submitted: { label: "Awaiting review", hint: "Your evidence is with your teacher." },
  verification_required: { label: "Verification required", hint: "Your teacher will verify this mission." },
  revision_requested: { label: "Revision requested", hint: "Update your evidence and submit again." },
  completed: { label: "Mission complete", hint: "Verified. Points awarded." },
  verified: { label: "Mission complete", hint: "Verified. Points awarded." },
  rejected: { label: "Not accepted", hint: "Talk to your teacher and try again." },
};

function InkStars({ difficulty }: { difficulty?: string }) {
  const value = STARS[String(difficulty ?? "easy")] ?? 1;
  return (
    <span style={{ display: "inline-flex", gap: 2, color: "var(--fj-ghaf-dark)" }}>
      {[1, 2, 3].map((s) => (
        <svg key={s} viewBox="0 0 24 24" width="13" height="13" fill={s <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.9-5.2 2.9 1-5.9L3.5 9.6l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

function Stamp({ text }: { text: string }) {
  return (
    <span className="fj-rubber-stamp" style={{ fontSize: 11, padding: "8px 16px", transform: "rotate(-3deg)" }}>
      {text}
    </span>
  );
}

export default function MissionDetail() {
  const { id: slug } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthContext();
  const isStudent = isAuthenticated && user?.role === "student";

  const missionQuery = trpc.missions.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: Boolean(slug) });
  const yearQuery = trpc.academicYears.getCurrent.useQuery();
  const mission = missionQuery.data;

  const completionQuery = trpc.missionCompletions.getMine.useQuery(
    { missionId: mission?.id ?? 0, academicYearId: yearQuery.data?.id ?? 0 },
    { enabled: Boolean(mission?.id && yearQuery.data?.id && isStudent) },
  );
  const startMutation = trpc.missionCompletions.start.useMutation({ onSuccess: () => completionQuery.refetch() });
  const submitMutation = trpc.missionCompletions.submit.useMutation({ onSuccess: () => completionQuery.refetch() });

  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const completion = completionQuery.data;
  const status = completion?.status ? STATUS[completion.status] : undefined;
  const canStart = Boolean(isStudent && mission && yearQuery.data && !completion && !startMutation.isPending);
  const canSubmit = Boolean(
    completion && (completion.status === "in_progress" || completion.status === "revision_requested") && !submitMutation.isPending,
  );

  const instructions: string[] = String(mission?.instructions ?? "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  // ختم بطاقة بو غصن عند الدخول + طرقة خفيفة
  useEffect(() => {
    if (!mission) return;
    const card = document.querySelector<HTMLElement>(".fj-ghosn-card");
    if (card) {
      journalSfx.puff();
      stampIn(card, { intensity: 0.5 });
    }
  }, [Boolean(mission)]);

  return (
    <div
      className="fj min-h-screen"
      style={{
        backgroundColor: "var(--fj-paper)",
        backgroundImage:
          "linear-gradient(rgba(58,92,120,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(58,92,120,.13) 1px, transparent 1px), radial-gradient(120% 120% at 15% 5%, var(--fj-paper-light) 0%, var(--fj-paper) 55%, var(--fj-paper-2) 100%)",
        backgroundSize: "24px 24px, 24px 24px, auto",
        color: "var(--fj-ink)",
        fontFamily: "var(--fj-font)",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex items-center justify-between">
          <div className="fj-type-label flex items-center gap-2 text-[11px]">
            <Link href="/missions">
              <span className="cursor-pointer">Mission board</span>
            </Link>
            <span>›</span>
            <span>{mission?.zoneName ?? "Zone"}</span>
          </div>
          <Link href="/eco-journey">
            <span className="fj-type-label cursor-pointer text-[11px]">Eco Journey</span>
          </Link>
        </div>

        {missionQuery.isLoading && <p className="fj-type-label mt-10 text-[11px]">Loading the mission…</p>}

        {missionQuery.isError && (
          <p className="mt-10" style={{ fontFamily: "var(--fj-type)", color: "var(--fj-clay)" }}>
            This mission could not be loaded. Please refresh.
          </p>
        )}

        {!missionQuery.isLoading && !missionQuery.isError && !mission && (
          <p className="mt-10" style={{ fontFamily: "var(--fj-hand)", fontSize: 26, color: "var(--fj-pencil)" }}>
            Mission not found — it may not be published yet.
          </p>
        )}

        {mission && (
          <>
            <h1 className="fj-ink-title mt-4 text-4xl sm:text-5xl" style={{ lineHeight: 1.03 }}>
              {mission.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="fj-type-label" style={{ fontSize: 10 }}>
                {mission.zoneName ?? "Sustainability"} · {TYPE_LABELS[mission.missionType] ?? mission.missionType}
              </span>
              <InkStars difficulty={mission.difficulty} />
              <span className="fj-type-label" style={{ fontSize: 10 }}>
                {mission.estimatedMinutes} min · {mission.pointsAvailable} points
              </span>
              {status && <Stamp text={status.label} />}
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
              <div>
                <p className="text-lg leading-relaxed" style={{ color: "var(--fj-ink-soft)", maxWidth: 560 }}>
                  {mission.description}
                </p>

                {status && (
                  <p className="fj-hand-note mt-4 text-xl">{status.hint}</p>
                )}

                {/* خطوات المهمة على ورق مسطّر */}
                <div className="fj-type-label mt-9 text-[10px]">Quest steps</div>
                <ol className="mt-4 space-y-3">
                  {instructions.map((line, index) => (
                    <li key={index} className="flex gap-3" style={{ borderBottom: "1px dashed var(--fj-line)", paddingBottom: 10 }}>
                      <span
                        style={{
                          fontFamily: "var(--fj-type)",
                          fontSize: 12,
                          color: "var(--fj-clay)",
                          border: "1.6px solid var(--fj-clay)",
                          borderRadius: "50%",
                          width: 26,
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "0 0 auto",
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="leading-relaxed" style={{ color: "var(--fj-ink)" }}>
                        {line}
                      </span>
                    </li>
                  ))}
                  {instructions.length === 0 && (
                    <li className="fj-hand-note text-lg">Follow your teacher&rsquo;s instructions for this mission.</li>
                  )}
                </ol>

                {/* تسليم الأدلة */}
                {!completion && (
                  <div className="mt-9">
                    {isStudent ? (
                      <button
                        type="button"
                        disabled={!canStart}
                        onClick={() =>
                          yearQuery.data && startMutation.mutate({ missionId: mission.id, academicYearId: yearQuery.data.id })
                        }
                        className="fj-rubber-stamp"
                        style={{ cursor: canStart ? "pointer" : "not-allowed", fontSize: 12, padding: "13px 26px", opacity: canStart ? 1 : 0.5 }}
                      >
                        {startMutation.isPending ? "Starting…" : "Accept mission"}
                      </button>
                    ) : (
                      <Link href="/login">
                        <span className="fj-rubber-stamp cursor-pointer" style={{ fontSize: 12, padding: "13px 26px" }}>
                          Sign in to start
                        </span>
                      </Link>
                    )}
                  </div>
                )}

                {completion && (completion.status === "in_progress" || completion.status === "revision_requested") && (
                  <form
                    className="mt-9"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitMutation.mutate({ id: completion.id, evidence: evidence || undefined, reflection: reflection || undefined });
                    }}
                  >
                    <div className="fj-type-label text-[10px]">Deliver your evidence</div>

                    <label className="mt-4 block text-sm font-bold" htmlFor="reflection">
                      Reflection — what did you discover, change, or create?
                    </label>
                    <textarea
                      id="reflection"
                      value={reflection}
                      onChange={(event) => setReflection(event.target.value)}
                      onBlur={() => {
                        if (reflection.trim()) void typewriter(document.getElementById("reflection") as HTMLElement | null, 0);
                      }}
                      rows={4}
                      placeholder="Write a few sentences…"
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "12px 14px",
                        background: "rgba(253,247,234,.75)",
                        border: "1px solid var(--fj-line)",
                        borderBottom: "2px solid rgba(34,48,42,.35)",
                        fontFamily: "var(--fj-font)",
                        fontSize: 15,
                        color: "var(--fj-ink)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />

                    <label className="mt-5 block text-sm font-bold" htmlFor="evidence">
                      Evidence note{mission.evidenceRequired && <span style={{ color: "var(--fj-clay)" }}> *</span>}
                    </label>
                    <textarea
                      id="evidence"
                      value={evidence}
                      onChange={(event) => setEvidence(event.target.value)}
                      rows={3}
                      placeholder="Describe your evidence or measurement…"
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "12px 14px",
                        background: "rgba(253,247,234,.75)",
                        border: "1px solid var(--fj-line)",
                        borderBottom: "2px solid rgba(34,48,42,.35)",
                        fontFamily: "var(--fj-font)",
                        fontSize: 15,
                        color: "var(--fj-ink)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />

                    <button
                      type="submit"
                      disabled={(mission.evidenceRequired && !evidence.trim()) || !canSubmit}
                      className="fj-rubber-stamp mt-6"
                      style={{ cursor: "pointer", fontSize: 12, padding: "13px 26px", opacity: canSubmit ? 1 : 0.5 }}
                    >
                      {submitMutation.isPending ? "Submitting…" : "Submit for review"}
                    </button>

                    {submitMutation.isError && (
                      <span className="fj-hand-note ml-4 text-lg">couldn&rsquo;t submit — please try again</span>
                    )}
                  </form>
                )}

                {completion?.teacherFeedback && (
                  <div
                    className="fj-specimen-card mt-9"
                    style={{ padding: "20px 22px", transform: "rotate(-.8deg)", background: "linear-gradient(180deg,#fdf6e7,#f2e6c9)" }}
                  >
                    <div className="fj-type-label text-[10px]">Teacher note</div>
                    <p className="mt-3 whitespace-pre-line leading-relaxed" style={{ color: "var(--fj-ink-soft)" }}>
                      {completion.teacherFeedback}
                    </p>
                  </div>
                )}
              </div>

              {/* العمود الجانبي: بو غصن + المكافآت */}
              <aside>
                <div
                  className="fj-ghosn-card fj-specimen-card"
                  style={{ padding: "22px 20px 18px", transform: "rotate(-1deg)", textAlign: "center" }}
                >
                  <div
                    style={{
                      width: 150,
                      height: 150,
                      margin: "0 auto",
                      borderRadius: "50%",
                      border: "2px dashed var(--fj-ghaf-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "radial-gradient(circle, var(--fj-ghaf-wash) 0%, transparent 70%)",
                    }}
                  >
                    <img src={buGhosn} alt="Bu Ghosn" style={{ height: 118, mixBlendMode: "multiply" }} />
                  </div>
                  <div className="fj-type-label mt-3 text-[10px]">Bu Ghosn · Eco guide</div>
                  <p className="fj-hand-note mt-3 text-xl" style={{ lineHeight: 1.25 }}>
                    {status?.label === "Mission complete"
                      ? "Mission complete — those points are yours."
                      : status?.label === "Awaiting review"
                        ? "Your evidence is with your teacher."
                        : status?.label === "In progress"
                          ? "You are on it. Bring back your evidence."
                          : "Ready? Read the steps and do the mission for real."}
                  </p>
                </div>

                <div className="mt-7" style={{ borderTop: "1px solid var(--fj-line)", paddingTop: 18 }}>
                  <div className="fj-type-label text-[10px]">Rewards</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span style={{ fontFamily: "var(--fj-display)", fontWeight: 900, fontSize: 44, color: "var(--fj-ghaf-dark)" }}>
                      {mission.pointsAvailable}
                    </span>
                    <span className="fj-type-label text-[10px]">points available</span>
                  </div>
                  <p className="fj-type-label mt-3 text-[10px]">
                    repeat policy: {String(mission.repeatPolicy ?? "once").replaceAll("_", " ")}
                  </p>
                  <div className="mt-4">
                    <Stamp text="Badges unlock" />
                  </div>
                </div>

                <div className="mt-7" style={{ borderTop: "1px solid var(--fj-line)", paddingTop: 16 }}>
                  <Link href="/my-journey">
                    <span className="fj-hand-note cursor-pointer text-lg">view my journey map →</span>
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}