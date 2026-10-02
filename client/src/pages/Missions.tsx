import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
// نظام تصميم «دفتر الميدان» (لا بد من استيراده في كل صفحة تستخدمه — Vite يقسّم CSS لكل حزمة)
import "@/lib/journalTheme.css";
import { journalSfx, stampIn, puffAt } from "@/lib/journalMotion";

const TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  investigate: "Investigate",
  act: "Act",
  experience: "Experience",
  collaborate: "Collaborate",
  create: "Create",
};

const DIFFICULTY_STARS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

/** نجوم الصعوبة مرسومة بالحبر (بدل الأيقونات النيونية) */
function InkStars({ difficulty }: { difficulty?: string }) {
  const value = DIFFICULTY_STARS[String(difficulty ?? "easy")] ?? 1;
  return (
    <span title={`Difficulty: ${difficulty ?? "easy"}`} style={{ display: "inline-flex", gap: 2, color: "var(--fj-ghaf-dark)" }}>
      {[1, 2, 3].map((step) => (
        <svg
          key={step}
          viewBox="0 0 24 24"
          width="13"
          height="13"
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
  const [zone, setZone] = useState<string>("all");

  const zones = useMemo(() => {
    const seen = new Map<string, string>();
    missions.forEach((mission) => {
      if (mission.zoneName && !seen.has(mission.zoneName)) {
        seen.set(mission.zoneName, mission.zoneIcon ?? "");
      }
    });
    return Array.from(seen.entries()).map(([name, icon]) => ({ name, icon }));
  }, [missions]);

  const visible = zone === "all" ? missions : missions.filter((mission) => mission.zoneName === zone);
  const totalPoints = missions.reduce((sum, mission) => sum + (mission.pointsAvailable ?? 0), 0);

  // دفتر الميدان: كاسكيد ختم البطاقات + أصوات (نفس محرّك اللعبة، بلا أي منطق جديد)
  useEffect(() => {
    if (!missions.length) return;
    const timers: number[] = [];
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".fj-mission-card"));
    cards.forEach((card, index) => {
      const timer = window.setTimeout(() => {
        if (!card.isConnected) return;
        journalSfx.stamp();
        stampIn(card, { intensity: 0.7 });
        puffAt(card, 3);
      }, 120 + index * 110);
      timers.push(timer);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [missions.length]);

  return (
    <div
      className="fj min-h-screen"
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #3a322a 0%, var(--fj-surface) 55%, #171310 100%)",
        color: "var(--fj-ink)",
        fontFamily: "var(--fj-font)",
      }}
    >
      <header
        className="sticky top-0 z-20"
        style={{ borderBottom: "1px solid var(--fj-line)", background: "rgba(36,31,27,.72)", backdropFilter: "blur(6px)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <span className="fj-type-label cursor-pointer text-xs" style={{ color: "var(--fj-paper)" }}>
              TEE-2026
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/eco-journey">
              <span className="fj-type-label cursor-pointer" style={{ color: "var(--fj-paper)" }}>
                Eco Journey
              </span>
            </Link>
            <Link href="/my-journey">
              <span className="fj-rubber-stamp cursor-pointer" style={{ padding: "5px 12px", fontSize: 10 }}>
                My Journey
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-6">
        <div className="fj-paper-sheet relative px-6 py-9 sm:px-12 sm:py-11">
          {/* خط الهامش الأحمر */}
          <span
            aria-hidden="true"
            style={{ position: "absolute", top: 22, bottom: 22, left: 46, width: 1.5, background: "rgba(171,74,38,.28)" }}
          />

          <div className="fj-type-label text-[11px]">Tomorrow&rsquo;s Earth Expo · Mission board</div>
          <h1 className="fj-ink-title mt-3 text-4xl sm:text-5xl" style={{ lineHeight: 1.02 }}>
            Sustainability Missions
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: "var(--fj-ink-soft)" }}>
            Pick a mission, do it for real, and bring back your evidence. Every approved mission grows your Eco Journey
            and unlocks badges.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: "missions", value: missions.length },
              { label: "zones", value: zones.length },
              { label: "points", value: totalPoints },
            ].map((item) => (
              <span key={item.label} className="fj-specimen-card" style={{ padding: "7px 14px", transform: "rotate(-1deg)" }}>
                <b style={{ fontFamily: "var(--fj-display)", fontSize: 20 }}>{item.value}</b>{" "}
                <span className="fj-type-label" style={{ fontSize: 10 }}>
                  {item.label}
                </span>
              </span>
            ))}
          </div>

          {zones.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <span className="fj-type-label mr-1 text-[10px]">Filter zone</span>
              {[{ name: "all", icon: "" }, ...zones].map((item) => {
                const active = zone === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setZone(item.name)}
                    className="fj-type-label"
                    style={{
                      fontSize: 11,
                      cursor: "pointer",
                      padding: "6px 14px",
                      border: `1.6px solid ${active ? "var(--fj-clay)" : "var(--fj-line)"}`,
                      background: active ? "rgba(171,74,38,.10)" : "rgba(253,247,234,.7)",
                      color: active ? "var(--fj-clay)" : "var(--fj-ink-soft)",
                      transform: `rotate(${active ? -1.5 : 0.8}deg)`,
                    }}
                  >
                    {item.icon ? `${item.icon} ` : ""}
                    {item.name === "all" ? "All" : item.name}
                  </button>
                );
              })}
            </div>
          )}

          {missionsQuery.isLoading && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="fj-specimen-card" style={{ height: 208, opacity: 0.5 }} />
              ))}
            </div>
          )}

          {missionsQuery.isError && (
            <p className="mt-8" style={{ fontFamily: "var(--fj-type)", color: "var(--fj-clay)" }}>
              Mission board could not be loaded. Please refresh the page.
            </p>
          )}

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((mission: any) => (
              <Link key={mission.id} href={`/missions/${mission.slug}`}>
                <article
                  className="fj-mission-card fj-specimen-card relative cursor-pointer"
                  style={{
                    padding: "26px 22px 18px",
                    transform: "rotate(-.6deg)",
                    transition: "transform .25s ease, box-shadow .25s ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateY(-6px) rotate(.4deg)";
                    event.currentTarget.style.boxShadow = "0 18px 34px rgba(0,0,0,.28)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "rotate(-.6deg)";
                    event.currentTarget.style.boxShadow = "var(--fj-shadow-card)";
                  }}
                >
                  <span
                    className="fj-tape-strip"
                    aria-hidden="true"
                    style={{ position: "absolute", top: -14, left: 24, width: 96, transform: "rotate(-4deg)" }}
                  />

                  <span
                    className="fj-type-label"
                    style={{
                      position: "absolute",
                      top: -13,
                      right: 14,
                      fontSize: 9.5,
                      padding: "4px 10px",
                      background: "var(--fj-ghaf-wash)",
                      border: "1px solid var(--fj-line)",
                      color: "var(--fj-ghaf-dark)",
                      transform: "rotate(1.6deg)",
                    }}
                  >
                    {mission.zoneName ?? "Sustainability"}
                  </span>

                  <div className="flex items-center justify-between gap-3">
                    <span className="fj-type-label" style={{ fontSize: 10 }}>
                      {TYPE_LABELS[mission.missionType] ?? mission.missionType}
                    </span>
                    <InkStars difficulty={mission.difficulty} />
                  </div>

                  <h2
                    style={{
                      fontFamily: "var(--fj-display)",
                      fontWeight: 900,
                      fontSize: 24,
                      lineHeight: 1.14,
                      marginTop: 8,
                      color: "var(--fj-ink)",
                    }}
                  >
                    {mission.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed" style={{ color: "var(--fj-ink-soft)" }}>
                    {mission.description}
                  </p>

                  <div
                    className="mt-4 flex items-end justify-between"
                    style={{ borderTop: "1px dashed var(--fj-line)", paddingTop: 12 }}
                  >
                    <span className="fj-type-label" style={{ fontSize: 10 }}>
                      {mission.estimatedMinutes} min
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--fj-type)",
                        fontSize: 12,
                        color: "var(--fj-clay)",
                        border: "2px solid var(--fj-clay)",
                        borderRadius: 4,
                        padding: "3px 9px",
                        transform: "rotate(-3deg)",
                        opacity: 0.92,
                      }}
                    >
                      {mission.pointsAvailable} pts
                    </span>
                  </div>

                  <span className="fj-hand-note mt-3 inline-block text-lg">open the mission →</span>
                </article>
              </Link>
            ))}
          </div>

          {!missionsQuery.isLoading && !missionsQuery.isError && missions.length === 0 && (
            <p className="mt-8" style={{ fontFamily: "var(--fj-hand)", fontSize: 24, color: "var(--fj-pencil)" }}>
              No missions on the board yet — new ones are on their way.
            </p>
          )}

          <div className="mt-10 flex" style={{ height: 12, border: "1px solid var(--fj-line)" }} aria-hidden="true">
            {["#f3e8d4", "#5d7d4a", "#c2912b", "#ab4a26", "#2b5a55", "#22302a"].map((color) => (
              <span key={color} style={{ flex: 1, background: color }} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}