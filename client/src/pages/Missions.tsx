import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import "@/lib/journalTheme.css";
import { journalSfx } from "@/lib/journalMotion";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

const DIFFICULTY_STARS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

/** نجوم الصعوبة بالحبر */
function InkStars({ difficulty, size = 12 }: { difficulty?: string; size?: number }) {
  const value = DIFFICULTY_STARS[String(difficulty ?? "easy")] ?? 1;
  return (
    <span style={{ display: "inline-flex", gap: 2, color: "var(--fj-ghaf-dark)" }}>
      {[1, 2, 3].map((step) => (
        <svg
          key={step}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          aria-hidden="true"
          fill={step <= value ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        >
          <path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.9-5.2 2.9 1-5.9L3.5 9.6l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

export default function Missions() {
  const missionsQuery = trpc.missions.getAll.useQuery();
  const missions: any[] = missionsQuery.data ?? [];
  const [active, setActive] = useState(0);

  // ترتيب حسب المنطقة (يُغني عن شريط الفلترة بالكامل)
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    missions.forEach((mission) => {
      const key = mission.zoneName ?? "Sustainability";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(mission);
    });
    return Array.from(map.entries());
  }, [missions]);

  const current = missions[active];
  const select = (index: number) => {
    if (index === active) return;
    setActive(index);
    journalSfx.pencil();
  };

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
        {/* سطر علوي هادئ */}
        <div className="flex items-center justify-between">
          <span className="fj-type-label text-[11px]">Tomorrow&rsquo;s Earth Expo · Mission board</span>
          <Link href="/eco-journey">
            <span className="fj-type-label cursor-pointer text-[11px]">Eco Journey</span>
          </Link>
        </div>

        {/* العنوان */}
        <h1 className="fj-ink-title mt-4 text-4xl sm:text-5xl" style={{ lineHeight: 1.02 }}>
          Sustainability Missions
        </h1>

        {/* شارة المسار: سلسلة حبر واحدة */}
        <div className="mt-7 flex items-center" style={{ gap: 6 }}>
          {missions.map((mission: any, index: number) => {
            const on = index === active;
            return (
              <div key={mission.id} className="flex flex-1 items-center" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => select(index)}
                  title={mission.title}
                  style={{
                    width: on ? 40 : 32,
                    height: on ? 40 : 32,
                    borderRadius: "50%",
                    cursor: "pointer",
                    border: on ? "2px solid var(--fj-ghaf-dark)" : "1.4px dashed rgba(34,48,42,.45)",
                    background: on ? "var(--fj-ghaf-light)" : "rgba(253,247,234,.55)",
                    color: on ? "#fdf7ea" : "var(--fj-ink-soft)",
                    fontFamily: "var(--fj-type)",
                    fontSize: 11,
                    transition: "all .2s ease",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </button>
                {index < missions.length - 1 && (
                  <span style={{ flex: 1, borderTop: "1.6px dashed rgba(34,48,42,.35)" }} />
                )}
              </div>
            );
          })}
        </div>

        {missionsQuery.isLoading && (
          <p className="fj-type-label mt-10 text-[11px]">Loading the board…</p>
        )}

        {/* الدفتر: فهرس يسار + صفحة المهمة يمين */}
        {current && (
          <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_1.05fr]">
            {/* الفهرس */}
            <div>
              <div className="fj-type-label text-[10px]">Index</div>
              <div className="mt-4 space-y-5">
                {groups.map(([zoneName, zoneMissions]) => (
                  <div key={zoneName}>
                    <div className="fj-type-label text-[9.5px]" style={{ color: "var(--fj-pencil)" }}>
                      {zoneName}
                    </div>
                    <div className="mt-2 space-y-2">
                      {zoneMissions.map((mission: any) => {
                        const index = missions.indexOf(mission);
                        const on = index === active;
                        return (
                          <button
                            key={mission.id}
                            type="button"
                            onClick={() => select(index)}
                            className="flex w-full items-baseline text-left"
                            style={{ gap: 10, cursor: "pointer", background: "none", border: "none", padding: 0 }}
                          >
                            <span className="fj-type-label" style={{ fontSize: 10, color: "var(--fj-ink-soft)" }}>
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--fj-display)",
                                fontWeight: on ? 900 : 600,
                                fontSize: 17,
                                color: on ? "var(--fj-clay)" : "var(--fj-ink)",
                              }}
                            >
                              {mission.title}
                            </span>
                            <span style={{ flex: 1, borderBottom: "1.5px dotted rgba(34,48,42,.28)", transform: "translateY(-4px)" }} />
                            <span className="fj-type-label" style={{ fontSize: 10, color: "var(--fj-ink-soft)" }}>
                              {mission.pointsAvailable} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* صفحة المهمة المختارة */}
            <div style={{ borderLeft: "1px solid var(--fj-line)", paddingLeft: 30 }}>
              <div className="fj-type-label text-[10px]">
                {String(active + 1).padStart(2, "0")} · {current.zoneName ?? "Sustainability"} ·{" "}
                {TYPE_LABELS[current.missionType] ?? current.missionType}
              </div>

              <h2
                style={{
                  fontFamily: "var(--fj-display)",
                  fontWeight: 900,
                  fontSize: 34,
                  lineHeight: 1.08,
                  marginTop: 10,
                  color: "var(--fj-ink)",
                }}
              >
                {current.title}
              </h2>

              <div className="mt-3 flex items-center gap-4">
                <InkStars difficulty={current.difficulty} size={13} />
                <span className="fj-type-label" style={{ fontSize: 10 }}>
                  {current.estimatedMinutes} min · {current.pointsAvailable} pts
                </span>
              </div>

              <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--fj-ink-soft)", maxWidth: 520 }}>
                {current.description}
              </p>

              <div className="mt-8 flex items-center gap-6">
                <Link href={`/missions/${current.slug}`}>
                  <span className="fj-rubber-stamp cursor-pointer" style={{ fontSize: 12, padding: "12px 24px" }}>
                    Open the mission →
                  </span>
                </Link>
                <Link href="/my-journey">
                  <span className="fj-hand-note cursor-pointer text-lg">my journey</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {!missionsQuery.isLoading && !missionsQuery.isError && missions.length === 0 && (
          <p className="mt-10" style={{ fontFamily: "var(--fj-hand)", fontSize: 24, color: "var(--fj-pencil)" }}>
            No missions on the board yet — new ones are on their way.
          </p>
        )}
      </div>
    </div>
  );
}