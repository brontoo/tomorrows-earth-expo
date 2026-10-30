import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, Clock3, Award, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
  stageFor,
  stageImage,
  missionStatus,
} from "@/components/field/GameShell";

export default function Missions() {
  const { isAuthenticated, user } = useAuthContext();
  const student = isAuthenticated && user?.role === "student";
  const query = trpc.missions.getAll.useQuery();
  const passport = trpc.passport.getMine.useQuery(undefined, {
    enabled: student,
  });
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const missions = query.data ?? [];
  const kinds = Array.from(new Set(missions.map(m => m.missionType)));
  const filtered = missions.filter(
    m =>
      (kind === "all" || m.missionType === kind) &&
      `${m.title} ${m.zoneName} ${stageFor(m.slug)?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );
  return (
    <GameShell>
      <FieldHeading
        eyebrow="THE FIELD CHALLENGES"
        title="A little action. A bigger change."
        description="Explore a station, try something new, and bring your discoveries back to the train."
      >
        <Link className="field-button" href="/eco-journey">
          Return to Eco Train <ArrowRight size={17} />
        </Link>
      </FieldHeading>
      <div className="field-filter-bar">
        <label className="field-search">
          <Search size={17} />
          <span className="field-sr-only">Search missions</span>
          <input
            aria-label="Search missions"
            placeholder="Find a mission or Emirate…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <label className="field-select">
          Challenge type
          <select
            aria-label="Challenge type"
            value={kind}
            onChange={e => setKind(e.target.value)}
          >
            <option value="all">All challenges</option>
            {kinds.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <span className="field-muted">
          {filtered.length} {filtered.length === 1 ? "mission" : "missions"}
        </span>
      </div>
      {query.isLoading && (
        <FieldNotice>Preparing the mission board…</FieldNotice>
      )}
      {query.isError && (
        <FieldNotice error onRetry={() => void query.refetch()}>
          The mission board could not be loaded.
        </FieldNotice>
      )}
      {student && passport.isError && (
        <FieldNotice error onRetry={() => void passport.refetch()}>
          Progress is temporarily unavailable. Your missions are still here.
        </FieldNotice>
      )}
      {!query.isLoading && !query.isError && filtered.length === 0 && (
        <div className="field-empty">
          <Compass size={30} />
          <h2>
            {missions.length
              ? "No matching discoveries."
              : "New challenges are on their way."}
          </h2>
          <p>
            {missions.length
              ? "Try another word or choose a different challenge type."
              : "Your teacher’s published missions will appear here."}
          </p>
          {missions.length > 0 && (
            <button
              className="field-text-link"
              onClick={() => {
                setSearch("");
                setKind("all");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
      <div className="field-mission-cards">
        {filtered.map(m => {
          const station = stageFor(m.slug);
          const state = passport.data?.missionStates?.find(
            s => s.missionId === m.id
          )?.status;
          return (
            <Link
              key={m.id}
              href={`/missions/${m.slug}`}
              className="field-mission-card"
            >
              <div className="field-card-art">
                <img src={stageImage(m.slug)} alt="" loading="lazy" />
                <span>{station?.name ?? m.zoneName ?? "Sustainability"}</span>
              </div>
              <div className="field-card-copy">
                <div className="field-card-top">
                  <span className="field-kicker">{m.missionType}</span>
                  {state && (
                    <span className="field-pill">{missionStatus(state)}</span>
                  )}
                </div>
                <h2>{m.title}</h2>
                <p>{m.description}</p>
                <div className="field-meta">
                  <span>
                    <Clock3 size={13} />
                    {m.estimatedMinutes} min
                  </span>
                  <span>
                    <Award size={13} />
                    {m.pointsAvailable} pts
                  </span>
                </div>
                <span className="field-card-action">
                  Open challenge <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </GameShell>
  );
}
