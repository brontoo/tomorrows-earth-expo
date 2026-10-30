import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Award,
  CheckCircle2,
  Compass,
  Leaf,
  Send,
} from "lucide-react";
import {
  GameShell,
  FieldNotice,
  stageFor,
  stageImage,
  stageNumber,
} from "@/components/field/GameShell";

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
  in_progress: {
    label: "In progress",
    hint: "Finish the mission and bring back your evidence.",
  },
  submitted: {
    label: "Awaiting review",
    hint: "Your evidence is with your teacher.",
  },
  verification_required: {
    label: "Verification required",
    hint: "Your teacher will verify this mission.",
  },
  revision_requested: {
    label: "Revision requested",
    hint: "Update your evidence and submit again.",
  },
  completed: { label: "Mission complete", hint: "Verified. Points awarded." },
  verified: { label: "Mission complete", hint: "Verified. Points awarded." },
  rejected: {
    label: "Not accepted",
    hint: "Talk to your teacher and try again.",
  },
};

export default function MissionDetail() {
  const { id: slug } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthContext();
  const isStudent = isAuthenticated && user?.role === "student";

  const missionQuery = trpc.missions.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: Boolean(slug) }
  );
  const yearQuery = trpc.academicYears.getCurrent.useQuery();
  const mission = missionQuery.data;

  const completionQuery = trpc.missionCompletions.getMine.useQuery(
    { missionId: mission?.id ?? 0, academicYearId: yearQuery.data?.id ?? 0 },
    { enabled: Boolean(mission?.id && yearQuery.data?.id && isStudent) }
  );
  const utils = trpc.useUtils();
  const refreshProgress = async () => {
    await Promise.all([
      completionQuery.refetch(),
      utils.passport.getMine.invalidate(),
      utils.missionCompletions.getMyList.invalidate(),
    ]);
  };
  const startMutation = trpc.missionCompletions.start.useMutation({
    onSuccess: refreshProgress,
  });
  const submitMutation = trpc.missionCompletions.submit.useMutation({
    onSuccess: refreshProgress,
  });

  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const completion = completionQuery.data;
  const status = completion?.status ? STATUS[completion.status] : undefined;
  const canStart = Boolean(
    isStudent &&
      mission &&
      yearQuery.data &&
      !completion &&
      !completionQuery.isLoading &&
      !completionQuery.isError &&
      !startMutation.isPending
  );
  const canSubmit = Boolean(
    completion &&
      (completion.status === "in_progress" ||
        completion.status === "revision_requested") &&
      !submitMutation.isPending
  );

  const instructions: string[] = String(mission?.instructions ?? "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map(line => line.trim())
    .filter(Boolean);

  const station = stageFor(slug);
  const finished =
    completion?.status === "completed" || completion?.status === "verified";
  return (
    <GameShell>
      <div className="field-breadcrumb">
        <Link href="/missions">
          <ArrowLeft size={15} /> Mission board
        </Link>
        <Link href="/eco-journey">
          Return to Eco Train <ArrowRight size={15} />
        </Link>
      </div>
      {missionQuery.isLoading && (
        <FieldNotice>Preparing your station challenge…</FieldNotice>
      )}
      {missionQuery.isError && (
        <FieldNotice error onRetry={() => void missionQuery.refetch()}>
          This mission could not be loaded.
        </FieldNotice>
      )}
      {!missionQuery.isLoading && !missionQuery.isError && !mission && (
        <FieldNotice>
          Mission not found — it may not be published yet.
        </FieldNotice>
      )}
      {mission && (
        <>
          <section className="field-mission-hero">
            <div className="field-mission-intro">
              <span className="field-kicker">
                {station
                  ? `${String(stageNumber(slug)).padStart(2, "0")} / ${station.name.toUpperCase()}`
                  : (mission.zoneName ?? "YOUR NEXT DISCOVERY")}
              </span>
              <h1>{mission.title}</h1>
              <p>{mission.description}</p>
              <div className="field-meta">
                <span>
                  <Compass size={14} />
                  {TYPE_LABELS[mission.missionType] ?? mission.missionType}
                </span>
                <span>
                  <Clock3 size={14} />
                  {mission.estimatedMinutes} min
                </span>
                <span>
                  <Award size={14} />
                  {mission.pointsAvailable} points available
                </span>
                <span>{mission.difficulty ?? "easy"}</span>
              </div>
            </div>
            <div className="field-station-art">
              <img
                src={stageImage(slug)}
                alt={
                  station
                    ? `${station.name}, your station for this challenge`
                    : "Illustrated UAE landscape"
                }
              />
              <span>
                {station?.name ?? mission.zoneName ?? "Explore the UAE"}
              </span>
            </div>
          </section>
          {isStudent && completionQuery.isLoading && (
            <FieldNotice>Checking your mission progress…</FieldNotice>
          )}
          {isStudent && completionQuery.isError && (
            <FieldNotice error onRetry={() => void completionQuery.refetch()}>
              Your mission progress could not be loaded. Please retry before
              starting.
            </FieldNotice>
          )}
          {status && (
            <div
              className={`field-status ${finished ? "is-verified" : ""}`}
              role="status"
            >
              <CheckCircle2 size={18} />
              <div>
                <strong>{status.label}</strong>
                <p>{status.hint}</p>
              </div>
              {finished && (
                <Link className="field-text-link" href="/eco-journey">
                  Continue journey <ArrowRight size={15} />
                </Link>
              )}
            </div>
          )}
          <div className="field-mission-grid">
            <div>
              <section className="field-panel">
                <span className="field-kicker">YOUR FIELD CHALLENGE</span>
                <h2>Curiosity into action.</h2>
                <p className="field-muted">
                  Take your time, notice the details, and record what you
                  discover.
                </p>
                <ol className="field-steps">
                  {instructions.map((line, index) => (
                    <li key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{line}</p>
                    </li>
                  ))}
                  {instructions.length === 0 && (
                    <li>
                      <p>
                        Follow your teacher’s instructions for this mission.
                      </p>
                    </li>
                  )}
                </ol>
              </section>
              {!completion && (
                <section className="field-panel field-start">
                  <h2>Ready to explore?</h2>
                  <p className="field-muted">
                    Start the challenge before collecting your evidence.
                  </p>
                  {isStudent ? (
                    <>
                      <button
                        className="field-button"
                        disabled={!canStart}
                        onClick={() =>
                          yearQuery.data &&
                          startMutation.mutate({
                            missionId: mission.id,
                            academicYearId: yearQuery.data.id,
                          })
                        }
                      >
                        {startMutation.isPending
                          ? "Starting…"
                          : "Accept mission"}
                        <ArrowRight size={17} />
                      </button>
                      {yearQuery.isError && (
                        <FieldNotice
                          error
                          onRetry={() => void yearQuery.refetch()}
                        >
                          The academic year could not be loaded.
                        </FieldNotice>
                      )}
                      {startMutation.isError && (
                        <FieldNotice error>
                          Could not start the mission. Please try again.
                        </FieldNotice>
                      )}
                    </>
                  ) : (
                    <Link
                      className="field-button"
                      href={
                        "/login?redirectTo=" +
                        encodeURIComponent("/missions/" + slug)
                      }
                    >
                      Sign in to start <ArrowRight size={17} />
                    </Link>
                  )}
                </section>
              )}
              {completion &&
                (completion.status === "in_progress" ||
                  completion.status === "revision_requested") && (
                  <section className="field-panel">
                    <span className="field-kicker">YOUR DISCOVERIES</span>
                    <h2>Leave a little evidence.</h2>
                    <p className="field-muted">
                      Your teacher will review what you share. Points and stamps
                      follow verification.
                    </p>
                    <form
                      className="field-form"
                      aria-busy={submitMutation.isPending}
                      onSubmit={event => {
                        event.preventDefault();
                        submitMutation.mutate({
                          id: completion.id,
                          evidence: evidence || undefined,
                          reflection: reflection || undefined,
                        });
                      }}
                    >
                      <label htmlFor="reflection">
                        Reflection — what did you discover, change, or create?
                      </label>
                      <textarea
                        id="reflection"
                        rows={4}
                        value={reflection}
                        onChange={e => setReflection(e.target.value)}
                        disabled={submitMutation.isPending}
                        placeholder="Write a few sentences…"
                      />
                      <label htmlFor="evidence">
                        Evidence note
                        {mission.evidenceRequired && (
                          <span aria-hidden="true"> *</span>
                        )}
                      </label>
                      <textarea
                        id="evidence"
                        rows={3}
                        value={evidence}
                        onChange={e => setEvidence(e.target.value)}
                        disabled={submitMutation.isPending}
                        required={Boolean(mission.evidenceRequired)}
                        placeholder="Describe your evidence or measurement…"
                      />
                      <button
                        className="field-button"
                        type="submit"
                        disabled={
                          (mission.evidenceRequired && !evidence.trim()) ||
                          !canSubmit
                        }
                      >
                        {submitMutation.isPending
                          ? "Submitting…"
                          : "Submit for review"}
                        <Send size={16} />
                      </button>
                      {submitMutation.isError && (
                        <FieldNotice error>
                          Could not submit — please try again.
                        </FieldNotice>
                      )}
                    </form>
                  </section>
                )}
              {completion?.teacherFeedback && (
                <section className="field-panel field-teacher-note">
                  <span className="field-kicker">A NOTE FROM YOUR TEACHER</span>
                  <p>{completion.teacherFeedback}</p>
                </section>
              )}
            </div>
            <aside className="field-mission-aside">
              <div className="field-guide-card">
                <img
                  src="/train/Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg"
                  alt="Bu Ghosn, your eco guide"
                />
                <span className="field-kicker">YOUR ECO GUIDE</span>
                <h2>
                  A little care.
                  <br />A lasting difference.
                </h2>
                <p>
                  {finished
                    ? "Your work is verified. Your passport keeps the reward."
                    : completion?.status === "submitted"
                      ? "Your evidence is with your teacher."
                      : "Look closely, try things out, and tell us what you learn."}
                </p>
              </div>
              <div className="field-reward">
                <Award size={23} />
                <span className="field-kicker">CHALLENGE REWARD</span>
                <strong>
                  {mission.pointsAvailable}
                  <small>points available</small>
                </strong>
                <p>Awarded after completion is verified.</p>
                <span className="field-muted">
                  Repeat policy:{" "}
                  {String(mission.repeatPolicy ?? "once").replaceAll("_", " ")}
                </span>
              </div>
              <Link className="field-text-link" href="/my-journey">
                Open my passport <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </>
      )}
    </GameShell>
  );
}
