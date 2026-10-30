import { Link } from "wouter";
import {
  ArrowRight,
  TrainFront,
  Award,
  Clock3,
  Compass,
  Ticket,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { stations } from "@/components/game/train/journeyScenes";
import { isComplete } from "@/components/game/train/persistence";
import {
  FieldHeading,
  FieldNotice,
  stageImage,
  missionStatus,
} from "./GameShell";
export function StudentJourneyOverview() {
  const { user } = useAuthContext();
  const catalogue = trpc.missions.getAll.useQuery();
  const query = trpc.passport.getMine.useQuery();
  const passport = query.data;
  const completed = stations.map(station => {
    const mission = catalogue.data?.find(m => m.slug === station.missionSlug);
    return Boolean(
      mission &&
        isComplete(
          passport?.missionStates?.find(s => s.missionId === mission.id)?.status
        )
    );
  });
  const count = completed.filter(Boolean).length;
  const index = completed.findIndex(value => !value);
  const next = stations[index < 0 ? 6 : index];
  const mission = catalogue.data?.find(m => m.slug === next.missionSlug);
  const state = passport?.missionStates?.find(
    s => s.missionId === mission?.id
  )?.status;
  const pending =
    passport?.missionStates?.filter(s =>
      ["submitted", "verification_required"].includes(s.status)
    ).length ?? 0;
  return (
    <>
      <FieldHeading
        eyebrow="YOUR STUDENT FIELD STATION"
        title={`Good to see you, ${(user?.name ?? "Explorer").split(" ")[0]}.`}
        description="A new discovery, a thoughtful action, a little progress. Your next chapter is waiting."
      />
      {(query.isLoading || catalogue.isLoading) && (
        <FieldNotice>Gathering your journey…</FieldNotice>
      )}
      {(query.isError || catalogue.isError) && (
        <FieldNotice
          error
          onRetry={() =>
            void Promise.all([query.refetch(), catalogue.refetch()])
          }
        >
          Your journey could not be refreshed. Your saved progress is safe.
        </FieldNotice>
      )}
      {passport && catalogue.data && (
        <>
          <section className="field-dashboard-hero">
            <div>
              <span className="field-kicker">
                {count === 7 ? "SEVEN EMIRATES EXPLORED" : "YOUR NEXT STATION"}
              </span>
              <h2>
                {count === 7 ? "What a journey." : next.name}
                <em>
                  {count === 7
                    ? "Keep your curiosity."
                    : "Your next discovery."}
                </em>
              </h2>
              <p>
                {state && ["submitted", "verification_required"].includes(state)
                  ? "Your evidence is with your teacher. Your next stop unlocks after approval."
                  : mission
                    ? mission.title
                    : "The station’s challenge is being prepared by your teacher."}
              </p>
              <div className="field-actions">
                <Link href="/eco-journey" className="field-button">
                  Continue journey <ArrowRight size={17} />
                </Link>
                <Link href="/my-journey" className="field-text-link">
                  Open my passport <Ticket size={16} />
                </Link>
              </div>
            </div>
            <div className="field-dashboard-art">
              <img
                src={stageImage(next.missionSlug)}
                alt={`${next.name}, a stop on your Eco Train journey`}
              />
              <span>
                <TrainFront size={16} /> THE SEVEN EMIRATES JOURNEY
              </span>
            </div>
          </section>
          <div className="field-stats">
            <article>
              <Ticket size={19} />
              <span>Verified station stamps</span>
              <strong>
                {count}
                <small>/ 7</small>
              </strong>
            </article>
            <article>
              <Award size={19} />
              <span>Sustainability points</span>
              <strong>{passport.totalPoints}</strong>
            </article>
            <article>
              <Clock3 size={19} />
              <span>Awaiting teacher review</span>
              <strong>{pending}</strong>
            </article>
          </div>
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">YOUR ROUTE ACROSS THE UAE</span>
              <h2>Seven stops. One shared future.</h2>
            </div>
            <Link className="field-text-link" href="/my-journey">
              View all stamps <ArrowRight size={15} />
            </Link>
          </div>
          <div className="field-dashboard-route">
            {stations.map((station, i) => (
              <Link
                href="/eco-journey"
                key={station.id}
                className={
                  completed[i]
                    ? "is-earned"
                    : i === (index < 0 ? 6 : index)
                      ? "is-current"
                      : ""
                }
                aria-label={`${station.name}: ${completed[i] ? "Stamp earned" : i === index ? "Current challenge" : "Upcoming stop"}`}
              >
                <img src={station.map} alt="" />
                <strong>{station.name}</strong>
                <span>
                  {completed[i]
                    ? "Stamp earned"
                    : i === index
                      ? "Current challenge"
                      : "Upcoming stop"}
                </span>
              </Link>
            ))}
          </div>
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">KEEP EXPLORING</span>
              <h2>Where curiosity takes you.</h2>
            </div>
          </div>
          <div className="field-quick-links">
            <Link href="/missions">
              <Compass size={24} />
              <h3>Find a challenge</h3>
              <p>Published missions, fresh questions, and real-world action.</p>
              <ArrowRight size={19} />
            </Link>
            <Link href="/explore">
              <TrainFront size={24} />
              <h3>Explore learning paths</h3>
              <p>Discover the systems that make our planet a shared home.</p>
              <ArrowRight size={19} />
            </Link>
            <Link href="/impact">
              <Award size={24} />
              <h3>See our shared impact</h3>
              <p>School measurements reviewed and verified by teachers.</p>
              <ArrowRight size={19} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
