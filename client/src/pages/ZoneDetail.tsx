import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Clock3, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
} from "@/components/field/GameShell";
export default function ZoneDetail() {
  const { categorySlug: slug } = useParams<{ categorySlug: string }>();
  const query = trpc.zones.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: Boolean(slug) }
  );
  const catalogue = trpc.missions.getAll.useQuery(undefined, {
    enabled: Boolean(query.data?.id),
  });
  const zone = query.data;
  const missions = catalogue.data?.filter(m => m.zoneId === zone?.id) ?? [];
  return (
    <GameShell>
      <div className="field-breadcrumb">
        <Link href="/explore">
          <ArrowLeft size={15} /> Back to Explore
        </Link>
        <Link href="/eco-journey">
          Return to Eco Train <ArrowRight size={15} />
        </Link>
      </div>
      {query.isLoading && (
        <FieldNotice>Opening your learning path…</FieldNotice>
      )}
      {query.isError && (
        <FieldNotice error onRetry={() => void query.refetch()}>
          This zone could not be loaded.
        </FieldNotice>
      )}
      {!query.isLoading && !query.isError && !zone && (
        <div className="field-empty">
          <h1>Zone not found.</h1>
          <p>This learning path may not be active.</p>
        </div>
      )}
      {zone && (
        <>
          <FieldHeading
            eyebrow="YOUR LEARNING PATH"
            title={zone.name}
            description={
              zone.description ||
              "Follow your curiosity, discover new connections, and take action."
            }
          >
            <span className="field-heading-icon" aria-hidden="true">
              {zone.icon || <Compass size={62} strokeWidth={1} />}
            </span>
          </FieldHeading>
          <div className="field-section-heading">
            <div>
              <span className="field-kicker">CURIOSITY INTO ACTION</span>
              <h2>Missions in this zone.</h2>
            </div>
            <span className="field-muted">
              {missions.length} published challenges
            </span>
          </div>
          {catalogue.isLoading && (
            <FieldNotice>Preparing your challenges…</FieldNotice>
          )}
          {catalogue.isError && (
            <FieldNotice error onRetry={() => void catalogue.refetch()}>
              These missions could not be loaded.
            </FieldNotice>
          )}
          {!catalogue.isLoading &&
            !catalogue.isError &&
            missions.length === 0 && (
              <div className="field-empty">
                <h2>Something new is growing here.</h2>
                <p>
                  Published missions will appear as your teacher prepares them.
                </p>
              </div>
            )}
          <div className="field-zone-grid">
            {missions.map(m => (
              <Link
                key={m.id}
                href={`/missions/${m.slug}`}
                className="field-zone-card"
              >
                <span className="field-kicker">{m.missionType}</span>
                <h2>{m.title}</h2>
                <p>{m.description}</p>
                <div className="field-meta">
                  <span>
                    <Clock3 size={14} />
                    {m.estimatedMinutes} min
                  </span>
                  <span>{m.pointsAvailable} points available</span>
                </div>
                <span className="field-card-action">
                  Open challenge <ArrowRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </GameShell>
  );
}
