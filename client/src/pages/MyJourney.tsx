import { Link } from "wouter";
import { ArrowRight, Award, Check, Ticket, Clock3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
  missionStatus,
} from "@/components/field/GameShell";
import { stations } from "@/components/game/train/journeyScenes";
import { isComplete } from "@/components/game/train/persistence";

export default function MyJourney({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { isAuthenticated, user, loading } = useAuthContext();
  const student = isAuthenticated && user?.role === "student";
  const query = trpc.passport.getMine.useQuery(undefined, { enabled: student });
  const catalogue = trpc.missions.getAll.useQuery(undefined, {
    enabled: student,
  });
  const passport = query.data;
  const badges = passport?.badges ?? [];
  const earned = badges.filter(item => item.earnedAt);
  const total = passport?.totalPoints ?? 0;
  const start = passport?.currentLevel?.minPoints ?? 0;
  const next = passport?.nextLevel;
  const progress = next
    ? Math.max(
        0,
        Math.min(
          100,
          ((total - start) / Math.max(1, next.minPoints - start)) * 100
        )
      )
    : passport?.currentLevel
      ? 100
      : 0;
  const content = (
    <>
      <FieldHeading
        eyebrow="YOUR ECO PASSPORT"
        title="Every discovery leaves a mark."
        description="Your verified challenges, station stamps, and growing collection of achievements."
      >
        <Link className="field-button" href="/eco-journey">
          Continue journey <ArrowRight size={17} />
        </Link>
      </FieldHeading>
      {(loading || (student && query.isLoading)) && (
        <FieldNotice>Opening your passport…</FieldNotice>
      )}
      {!loading && !student && (
        <div className="field-empty">
          <Ticket size={32} />
          <h2>Your passport is waiting.</h2>
          <p>Sign in with a student account to view your points and stamps.</p>
          <Link className="field-button" href="/login?redirectTo=%2Fmy-journey">
            Sign in <ArrowRight size={17} />
          </Link>
        </div>
      )}
      {query.isError && (
        <FieldNotice error onRetry={() => void query.refetch()}>
          Your passport could not be loaded. Your saved progress has not
          changed.
        </FieldNotice>
      )}
      {student && passport && (
        <>
          <section className="field-passport-cover">
            <div>
              <span className="field-kicker">
                {passport.academicYear?.label ?? "YOUR CURRENT JOURNEY"}
              </span>
              <h2>{user?.name ?? "Explorer"}’s passport</h2>
              <p>Small steps, thoughtfully taken.</p>
              <div className="field-level">
                <span>
                  {passport.currentLevel?.name ?? "Your journey is beginning"}
                </span>
                <span>
                  {next
                    ? `${Math.max(0, next.minPoints - total)} points to ${next.name}`
                    : passport.currentLevel
                      ? "Highest configured level"
                      : "Levels are being prepared"}
                </span>
              </div>
              <div
                className="field-progress-track"
                role="progressbar"
                aria-label="Progress to next level"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: progress + "%" }} />
              </div>
            </div>
            <div className="field-passport-score">
              <Award size={29} />
              <strong>{total}</strong>
              <span>VERIFIED POINTS</span>
            </div>
          </section>
          <div className="field-stats">
            <article>
              <span>Missions completed</span>
              <strong>{passport.completedMissions ?? 0}</strong>
            </article>
            <article>
              <span>Badges earned</span>
              <strong>{earned.length}</strong>
            </article>
            <article>
              <span>Point events</span>
              <strong>{passport.recentEvents?.length ?? 0}</strong>
            </article>
          </div>
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">THE SEVEN EMIRATES</span>
              <h2>Your station stamps.</h2>
            </div>
            <span className="field-muted">
              Awarded after teacher verification
            </span>
          </div>
          {catalogue.isLoading && (
            <FieldNotice>Preparing your station stamps…</FieldNotice>
          )}
          {catalogue.isError && (
            <FieldNotice error onRetry={() => void catalogue.refetch()}>
              Station details could not be loaded.
            </FieldNotice>
          )}
          {catalogue.data && (
            <div className="field-stamp-grid">
              {stations.map((station, index) => {
                const mission = catalogue.data.find(
                  m => m.slug === station.missionSlug
                );
                const state = passport.missionStates?.find(
                  s => s.missionId === mission?.id
                )?.status;
                const complete = isComplete(state);
                return (
                  <article
                    key={station.id}
                    className={`field-station-stamp ${complete ? "is-earned" : ""}`}
                  >
                    <span className="field-kicker">
                      STATION {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="field-stamp-mark">
                      <img src={station.map} alt="" />
                      {complete && <Check size={17} />}
                    </div>
                    <h3>{station.name}</h3>
                    <p>
                      {complete
                        ? "Stamp earned"
                        : state
                          ? missionStatus(state)
                          : "Not stamped yet"}
                    </p>
                    {mission ? (
                      <Link
                        className="field-text-link"
                        href={`/missions/${mission.slug}`}
                      >
                        {complete ? "Revisit challenge" : "View challenge"}{" "}
                        <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <span className="field-muted">
                        Mission being prepared
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">A GROWING COLLECTION</span>
              <h2>Badges & achievements.</h2>
            </div>
          </div>
          {badges.length === 0 ? (
            <div className="field-notice">
              Your teacher’s configured badges will appear here as your journey
              grows.
            </div>
          ) : (
            <div className="field-badge-grid">
              {badges.map(item => (
                <article
                  key={item.badge.id}
                  className={`field-badge ${item.earnedAt ? "is-earned" : ""}`}
                >
                  <Award size={28} />
                  <h3>{item.badge.name}</h3>
                  <p>{item.badge.description}</p>
                  <span className="field-pill">
                    {item.earnedAt
                      ? "Earned this academic year"
                      : "Not earned yet"}
                  </span>
                </article>
              ))}
            </div>
          )}
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">YOUR RECENT CHAPTERS</span>
              <h2>A record of your progress.</h2>
            </div>
          </div>
          <div className="field-panel">
            {passport.recentEvents?.length ? (
              <ul className="field-events">
                {passport.recentEvents.map(event => (
                  <li key={event.id}>
                    <Clock3 size={17} />
                    <div>
                      <strong>{event.reason}</strong>
                      <span>
                        {new Date(event.createdAt).toLocaleDateString("en-GB", {
                          timeZone: "Asia/Dubai",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <b>
                      {event.points > 0 ? "+" : ""}
                      {event.points} pts
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-muted">
                Verified point events will appear here when your work is
                reviewed.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
  return embedded ? (
    <div className="field-embedded">{content}</div>
  ) : (
    <GameShell>{content}</GameShell>
  );
}
