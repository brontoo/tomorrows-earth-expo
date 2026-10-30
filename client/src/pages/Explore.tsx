import { Link } from "wouter";
import { ArrowRight, Compass, Leaf } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
} from "@/components/field/GameShell";
export default function Explore() {
  const query = trpc.zones.getAll.useQuery();
  return (
    <GameShell>
      <FieldHeading
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="A world worth exploring."
        description="Water, energy, habitats, and the everyday systems that connect us. Find a learning path that makes you curious."
      >
        <Compass className="field-heading-icon" size={62} strokeWidth={0.8} />
      </FieldHeading>
      {query.isLoading && (
        <FieldNotice>Preparing your learning paths…</FieldNotice>
      )}
      {query.isError && (
        <FieldNotice error onRetry={() => void query.refetch()}>
          We could not load the sustainability zones.
        </FieldNotice>
      )}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <div className="field-empty">
          <Leaf size={30} />
          <h2>New paths are taking root.</h2>
          <p>Your teacher’s learning zones will appear here soon.</p>
        </div>
      )}
      <div className="field-zone-grid">
        {query.data?.map((zone, index) => (
          <Link
            key={zone.id}
            href={`/explore/${zone.slug}`}
            className="field-zone-card"
          >
            {zone.coverImage && (
              <img
                className="field-zone-cover"
                src={zone.coverImage}
                alt=""
                loading="lazy"
              />
            )}
            <div className="field-card-top">
              <span className="field-kicker">
                PATH {String(index + 1).padStart(2, "0")}
              </span>
              <span className="field-zone-icon" aria-hidden="true">
                {zone.icon || <Compass size={26} strokeWidth={1} />}
              </span>
            </div>
            <h2>{zone.name}</h2>
            <p>
              {zone.description ||
                "Discover the learning, missions, and stories in this zone."}
            </p>
            <span className="field-card-action">
              Explore zone <ArrowRight size={17} />
            </span>
          </Link>
        ))}
      </div>
    </GameShell>
  );
}
