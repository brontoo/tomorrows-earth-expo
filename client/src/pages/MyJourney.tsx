import Navigation from "@/components/Navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import "@/lib/journalTheme.css";
import { journalSfx, stampIn, inkRing } from "@/lib/journalMotion";

export default function MyJourney({ embedded = false }: { embedded?: boolean }) {
  const passportQuery = trpc.passport.getMine.useQuery();
  const passport = passportQuery.data;
  const currentLevel = passport?.currentLevel;
  const nextLevel = passport?.nextLevel;
  const currentStart = currentLevel?.minPoints ?? 0;
  const nextTarget = nextLevel?.minPoints ?? Math.max(currentStart + 1, (passport?.totalPoints ?? 0) + 1);
  const progress = Math.min(
    100,
    Math.max(0, (((passport?.totalPoints ?? 0) - currentStart) / Math.max(1, nextTarget - currentStart)) * 100),
  );
  const earnedBadges = passport?.badges.filter((item) => item.earnedAt) ?? [];

  // كاسكيد ختم الأختام المكتسبة + طرقة لكل ختم (نفس محرّك اللعبة)
  useEffect(() => {
    if (!earnedBadges.length) return;
    const timers: number[] = [];
    const stamps = Array.from(document.querySelectorAll<HTMLElement>(".fj-passport-stamp[data-earned='1']"));
    stamps.forEach((stamp, index) => {
      const timer = window.setTimeout(() => {
        if (!stamp.isConnected) return;
        journalSfx.stamp();
        stampIn(stamp, { intensity: 0.6 });
      }, 200 + index * 160);
      timers.push(timer);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [earnedBadges.length]);

  return (
    <div
      className={embedded ? "fj" : "fj min-h-screen"}
      style={{
        backgroundColor: "var(--fj-paper)",
        backgroundImage:
          "linear-gradient(rgba(58,92,120,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(58,92,120,.13) 1px, transparent 1px), radial-gradient(120% 120% at 15% 5%, var(--fj-paper-light) 0%, var(--fj-paper) 55%, var(--fj-paper-2) 100%)",
        backgroundSize: "24px 24px, 24px 24px, auto",
        color: "var(--fj-ink)",
        fontFamily: "var(--fj-font)",
      }}
    >
      {!embedded && <Navigation />}

      <main className={embedded ? "w-full" : "mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14"}>
        {/* الغلاف */}
        <section
          style={{
            background: "linear-gradient(150deg, #3f5a35 0%, #2b4530 55%, #22302a 100%)",
            border: "1px solid rgba(34,48,42,.4)",
            borderRadius: 2,
            boxShadow: "0 22px 48px rgba(0,0,0,.35)",
            padding: "34px 32px 30px",
            color: "var(--fj-paper)",
          }}
        >
          <div className="fj-type-label" style={{ color: "rgba(243,232,212,.75)", fontSize: 10 }}>
            Tomorrow&rsquo;s Earth Expo · Eco passport
          </div>

          <h1
            style={{
              fontFamily: "var(--fj-display)",
              fontWeight: 900,
              fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
              lineHeight: 1.02,
              marginTop: 10,
              color: "#fdf7ea",
            }}
          >
            My Journey
          </h1>

          <div className="mt-5 flex flex-wrap items-end gap-8">
            <div>
              <div className="fj-type-label" style={{ fontSize: 9.5, color: "rgba(243,232,212,.7)" }}>
                Sustainability points
              </div>
              <div style={{ fontFamily: "var(--fj-display)", fontWeight: 900, fontSize: 58, lineHeight: 1, color: "#fdf7ea" }}>
                {passport?.totalPoints ?? 0}
              </div>
            </div>
            <div>
              <div className="fj-type-label" style={{ fontSize: 9.5, color: "rgba(243,232,212,.7)" }}>
                Current level
              </div>
              <div style={{ fontFamily: "var(--fj-display)", fontWeight: 900, fontSize: 24 }}>
                {currentLevel?.name || "Seed"}
              </div>
              {passport?.academicYear && (
                <div className="fj-type-label mt-1" style={{ fontSize: 9.5, color: "rgba(243,232,212,.7)" }}>
                  {passport.academicYear.label}
                </div>
              )}
            </div>
          </div>

          {/* خط التقدّم كخدش قلم */}
          <div className="mt-7" style={{ height: 10, border: "1.6px solid rgba(243,232,212,.55)", background: "rgba(253,247,234,.18)" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundImage:
                  "repeating-linear-gradient(105deg, rgba(253,247,234,.75) 0 3px, rgba(253,247,234,.45) 3px 6px)",
                transition: "width .4s ease",
              }}
            />
          </div>
          <p className="mt-3 text-sm" style={{ color: "rgba(243,232,212,.8)" }}>
            {nextLevel
              ? `${nextLevel.minPoints - (passport?.totalPoints ?? 0)} points until ${nextLevel.name}`
              : "You have reached the highest configured level."}
          </p>
        </section>

        {passportQuery.isLoading && (
          <p className="fj-type-label mt-10 text-[11px]">Opening your passport…</p>
        )}

        {passportQuery.isError && (
          <p className="mt-10" style={{ fontFamily: "var(--fj-type)", color: "var(--fj-clay)" }}>
            Your passport could not be loaded. Please sign in as a student.
          </p>
        )}

        {passport && (
          <>
            {/* أرقام هادئة بخط الآلة الكاتبة */}
            <div className="mt-8 flex flex-wrap items-end gap-8">
              {[
                { label: "missions completed", value: passport.completedMissions },
                { label: "badges earned", value: earnedBadges.length },
                { label: "recent point events", value: passport.recentEvents.length },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline gap-2">
                  <span style={{ fontFamily: "var(--fj-display)", fontWeight: 900, fontSize: 30, color: "var(--fj-ghaf-dark)" }}>
                    {item.value}
                  </span>
                  <span className="fj-type-label" style={{ fontSize: 10 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* الأختام */}
            <div className="mt-10" style={{ borderTop: "1px solid var(--fj-line)", paddingTop: 18 }}>
              <div className="fj-type-label text-[10px]">Passport stamps</div>

              <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {passport.badges.map((item) => {
                  const earned = Boolean(item.earnedAt);
                  return (
                    <div
                      key={item.badge.id}
                      className="fj-passport-stamp"
                      data-earned={earned ? "1" : "0"}
                      onMouseEnter={(event) => {
                        if (earned) inkRing(event.currentTarget, true);
                      }}
                      style={{ textAlign: "center", cursor: earned ? "pointer" : "default" }}
                    >
                      <div
                        style={{
                          width: 132,
                          height: 132,
                          margin: "0 auto",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: 12,
                          border: earned ? "3px double var(--fj-clay)" : "1.6px dashed rgba(34,48,42,.35)",
                          color: earned ? "var(--fj-clay)" : "var(--fj-pencil)",
                          background: earned ? "rgba(171,74,38,.06)" : "transparent",
                          transform: earned ? "rotate(-4deg)" : "none",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--fj-type)",
                            fontSize: 11,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.badge.name}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--fj-ink-soft)", maxWidth: 220, margin: "10px auto 0" }}>
                        {item.badge.description}
                      </p>

                      <span className="fj-type-label" style={{ fontSize: 9.5, color: earned ? "var(--fj-clay)" : "var(--fj-pencil)" }}>
                        {earned ? "earned this academic year" : "not stamped yet"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}