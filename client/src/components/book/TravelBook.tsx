import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import gsap from "gsap";
import { useBookProgress } from "./useBookProgress";
import { resolveBookEngine } from "./frames/engineConfig";
import { useFrameManifest } from "./frames/useFrameManifest";
import FrameBookPlayer from "./frames/FrameBookPlayer";
import GestureControls from "./gestures/GestureControls";
import { gesturePreviewEnabled } from "./gestures/GestureClassifier";
import type { BookFrameInput } from "./gestures/BookGestureController";
import {
  chapters,
  chapterProgress,
  bookReducer,
  type BookState,
} from "./chapters";
import { readBook, readStorage, saveBook, writeStorage } from "./persistence";
import { BookAudio } from "./BookAudio";
import "./book.css";
const FrameTravelBook = lazy(() => import("./FrameTravelBook"));
const BookScene = lazy(() => import("./BookScene"));

export default function TravelBook({ cover = false }: { cover?: boolean }) {
  if (
    !cover &&
    window.location.pathname === "/eco-journey" &&
    import.meta.env.VITE_BOOK_ENGINE === "frames"
  )
    return (
      <Suspense fallback={<p role="status">Loading the original book…</p>}>
        <FrameTravelBook />
      </Suspense>
    );
  return <LegacyTravelBook cover={cover} />;
}
function LegacyTravelBook({ cover }: { cover: boolean }) {
  const progress = useBookProgress();
  return (
    <BookJourney
      key={`${progress.profile}:${cover}`}
      cover={cover}
      {...progress}
    />
  );
}

type Props = {
  cover: boolean;
  profile: string;
  student: boolean;
  loading: boolean;
  error: boolean;
  missions: { id: number; slug: string; title: string }[];
  states: { missionId: number; status: string }[];
  refresh: () => void;
};
function BookJourney({
  cover,
  profile,
  student,
  loading,
  error,
  missions,
  states,
  refresh,
}: Props) {
  const progress = chapterProgress(missions, states);
  const saved = useRef(readBook(profile));
  const requested = chapters.findIndex(
    c => c.id === new URLSearchParams(window.location.search).get("chapter")
  );
  const [state, dispatch] = useReducer(bookReducer, {
    phase:
      requested < 0 &&
      window.location.pathname !== "/my-journey" &&
      !new URLSearchParams(window.location.search).has("spread")
        ? "cover"
        : new URLSearchParams(window.location.search).get("spread") ===
              "stamps" || window.location.pathname === "/my-journey"
          ? "stamps"
          : requested >= 0
            ? "ready"
            : "contents",
    chapter: Math.max(0, requested >= 0 ? requested : saved.current.chapter),
    destination: "reveal",
    serial: 0,
  } as BookState);
  const chapterIndex = Math.max(
    0,
    Math.min(chapters.length - 1, state.chapter)
  );
  const chapter = chapters[chapterIndex];
  const mission = missions.find(m => m.slug === chapter.missionSlug);
  const missionStatus = states.find(s => s.missionId === mission?.id)?.status;
  const earned = progress.completed[chapterIndex];
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [fallback, setFallback] = useState(false);
  const [muted, setMuted] = useState(
    () => readStorage("sevenEmiratesBook:muted") !== "false"
  );
  const [sound] = useState(() => new BookAudio());
  const shell = useRef<HTMLElement>(null);
  const gestureInput = useRef<BookFrameInput | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = ["opening", "turning", "stamping"].includes(state.phase);
  const inChapter = ["reveal", "ready", "stamping"].includes(state.phase);
  const frameMedia = useFrameManifest(
    import.meta.env.VITE_BOOK_ENGINE === "frames",
    import.meta.env.VITE_BOOK_ASSET_BASE_URL,
    import.meta.env.VITE_BOOK_MEDIA_VERSION
  );
  const [frameUnavailable, setFrameUnavailable] = useState(false);
  const frameSurface =
    inChapter || (state.phase === "turning" && state.destination === "reveal");
  const engine = frameSurface
    ? resolveBookEngine(import.meta.env.VITE_BOOK_ENGINE, {
        playerReady: true,
        assetsReady: Boolean(frameMedia.manifest) && !frameUnavailable,
      })
    : "legacy";
  const pendingFrameMedia =
    import.meta.env.VITE_BOOK_ENGINE === "frames" &&
    Boolean(import.meta.env.VITE_BOOK_ASSET_BASE_URL) &&
    frameSurface &&
    !frameMedia.manifest &&
    !frameMedia.error &&
    !frameUnavailable;
  const countText = `${progress.count} / 7 collected`;
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    sound.setMuted(muted);
    writeStorage("sevenEmiratesBook:muted", String(muted));
  }, [muted, sound]);
  useEffect(() => {
    const visibility = () => sound.visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      sound.dispose();
    };
  }, [sound]);
  useEffect(() => {
    if (fallback && ["opening", "turning"].includes(state.phase)) {
      const animation = gsap.delayedCall(reduced ? 0.05 : 0.45, () =>
        dispatch({ type: "ANIMATED" })
      );
      return () => {
        animation.kill();
      };
    }
  }, [fallback, state.phase, state.serial, reduced]);
  useEffect(() => {
    if (state.phase !== "cover")
      saveBook(profile, chapterIndex, saved.current.seenStamps);
    if (state.phase === "ready" && engine !== "frames")
      heading.current?.focus({ preventScroll: true });
    if (["ready", "contents", "stamps", "final"].includes(state.phase)) {
      const query =
        state.phase === "ready"
          ? `chapter=${chapter.id}`
          : `spread=${state.phase}`;
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}?${query}`
      );
    }
  }, [profile, chapterIndex, state.phase, loading, error, engine]);
  useEffect(() => {
    if (
      state.phase !== "ready" ||
      loading ||
      error ||
      !earned ||
      saved.current.seenStamps.includes(chapter.id)
    )
      return;
    dispatch({ type: "STAMP" });
  }, [earned, state.phase, chapter.id, loading, error]);
  useEffect(() => {
    if (state.phase !== "stamping") return;
    sound.play("stamp");
    const stamp = shell.current?.querySelector(".book-chapter-stamp");
    const timeline = gsap.timeline({
      onComplete: () => {
        saved.current.seenStamps = Array.from(
          new Set([...saved.current.seenStamps, chapter.id])
        );
        saveBook(profile, chapterIndex, saved.current.seenStamps);
        dispatch({ type: "STAMPED" });
      },
    });
    if (stamp)
      timeline.fromTo(
        stamp,
        { scale: reduced ? 1 : 1.7, opacity: 0, rotation: -16 },
        {
          scale: 1,
          opacity: 1,
          rotation: -9,
          duration: reduced ? 0.1 : 0.6,
          ease: "power3.in",
        }
      );
    else timeline.to({}, { duration: 0.1 });
    return () => {
      timeline.kill();
    };
  }, [state.phase, chapter.id, chapterIndex, profile, reduced, sound]);
  // Stage only the next film. Do not download seven films on the cover.
  useEffect(() => {
    if (
      !inChapter ||
      chapterIndex >= 6 ||
      engine === "frames" ||
      pendingFrameMedia
    )
      return;
    const next = document.createElement("video");
    next.preload = "metadata";
    next.muted = true;
    next.src = chapters[chapterIndex + 1].video;
    next.load();
    const poster = new Image();
    poster.src = chapters[chapterIndex + 1].poster;
    return () => {
      next.removeAttribute("src");
      next.load();
    };
  }, [chapterIndex, inChapter, engine, pendingFrameMedia]);
  const open = () => {
    sound.unlock();
    sound.play("open");
    dispatch({ type: "OPEN" });
  };
  const select = (index: number) => {
    if (busy) return;
    sound.unlock();
    sound.play("turn");
    dispatch({
      type: "SELECT",
      index,
    });
  };
  const spread = (target: "contents" | "stamps" | "final") => {
    sound.unlock();
    sound.play("turn");
    dispatch({ type: "SPREAD", spread: target });
  };
  const skip = () => {
    if (state.phase === "reveal") dispatch({ type: "REVEALED" });
    else dispatch({ type: "ANIMATED" });
  };
  const stateName = (i: number) =>
    inChapter && i === chapterIndex
      ? "Current"
      : progress.completed[i]
        ? "Achievement earned"
        : "Explore";
  return (
    <main
      ref={shell}
      className={`travel-book book-phase-${state.phase} ${fallback ? "book-fallback" : ""}`}
      dir="ltr"
      id="main-content"
      data-book-engine={engine}
    >
      <a className="book-skip-link" href="#book-content">
        Skip to book content
      </a>
      <header className="book-header">
        <Link href="/" className="book-wordmark">
          <BookOpen size={21} strokeWidth={1.3} />
          <span>
            THE SEVEN EMIRATES<small>A JOURNEY TO KEEP</small>
          </span>
        </Link>
        <nav aria-label="Platform navigation">
          <button
            onClick={() => {
              sound.unlock();
              setMuted(value => !value);
            }}
            aria-pressed={!muted}
            aria-label={muted ? "Enable book sounds" : "Mute book sounds"}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{muted ? "Sound off" : "Sound on"}</span>
          </button>
          <Link
            href={
              profile !== "guest"
                ? "/dashboard"
                : "/login?redirectTo=%2Feco-journey"
            }
          >
            {profile !== "guest" ? "My account" : "Sign in"}{" "}
            <ArrowRight size={14} />
          </Link>
          <Link href="/dashboard" className="book-expo-link">
            Expo
          </Link>
        </nav>
      </header>
      {gesturePreviewEnabled(
        import.meta.env.VITE_BOOK_ENGINE,
        import.meta.env.VITE_BOOK_GESTURES
      ) &&
        frameMedia.manifest &&
        !frameUnavailable && (
          <GestureControls scope={shell} input={gestureInput} />
        )}
      {state.phase === "cover" ? (
        <section className="book-cover-heading" id="book-content">
          <span className="book-eyebrow">
            SEVEN PLACES. ONE EXTRAORDINARY STORY.
          </span>
          <h1>
            The Seven <em>Emirates</em>
          </h1>
          <p>An Interactive Pop-Up Travel Book</p>
        </section>
      ) : (
        <div className="book-running-head" id="book-content">
          <button
            data-book-gesture="spread"
            disabled={busy}
            onClick={() => spread("contents")}
          >
            <ArrowLeft size={14} /> Contents
          </button>
          <span>
            {inChapter
              ? `CHAPTER ${String(chapter.order).padStart(2, "0")} / 07`
              : state.phase === "stamps"
                ? "YOUR COLLECTION"
                : state.phase === "final"
                  ? "THE FINAL SPREAD"
                  : "THE SEVEN EMIRATES"}
          </span>
          <button
            data-book-gesture="spread"
            disabled={busy}
            onClick={() => spread("stamps")}
          >
            My travel stamps <span>{progress.count}/7</span>
          </button>
        </div>
      )}
      <div className="book-stage-wrap">
        <section
          className="book-stage"
          aria-label={
            state.phase === "cover"
              ? "A closed green hardcover travel book"
              : `Interactive travel book: ${inChapter ? chapter.name : state.phase}`
          }
          aria-busy={busy}
        >
          {engine === "frames" && frameMedia.manifest && (
            <FrameBookPlayer
              gestureInput={gestureInput}
              manifest={frameMedia.manifest}
              baseUrl={frameMedia.baseUrl}
              chapter={chapterIndex}
              reduced={reduced}
              interactive={!busy}
              onChapter={id => {
                const index = chapters.findIndex(c => c.id === id);
                if (index !== chapterIndex) select(index);
              }}
              onReady={() => {
                dispatch({ type: "ANIMATED" });
                dispatch({ type: "REVEALED" });
              }}
              onFallback={() => setFrameUnavailable(true)}
            />
          )}
          {pendingFrameMedia && (
            <p className="book-media-loading" role="status">
              Preparing Full HD book imagery…
            </p>
          )}
          {engine === "legacy" && !fallback && !pendingFrameMedia && (
            <Suspense
              fallback={
                <img
                  className="book-render-loading"
                  src="/book/cover-reference.webp"
                  alt="Preparing the travel book"
                />
              }
            >
              <BookScene
                phase={state.phase}
                serial={state.serial}
                chapter={chapterIndex}
                reduced={reduced}
                onSettled={() => dispatch({ type: "ANIMATED" })}
                onFallback={() => setFallback(true)}
              />
            </Suspense>
          )}
          {engine === "legacy" && fallback && !pendingFrameMedia && (
            <img
              className="book-fallback-art"
              src={
                state.phase === "cover" || state.phase === "opening"
                  ? "/book/cover-reference.webp"
                  : chapter.poster
              }
              alt="Handcrafted paper travel book"
            />
          )}
          {engine === "legacy" && inChapter && !pendingFrameMedia && (
            <ChapterReveal
              key={chapter.id}
              chapter={chapter}
              playing={state.phase === "reveal" && !reduced}
              onReady={() => dispatch({ type: "REVEALED" })}
              onUnfold={() => sound.play("fold")}
            />
          )}
          {["opening", "turning", "reveal"].includes(state.phase) && (
            <button className="book-skip-animation" onClick={skip}>
              Skip animation <ArrowRight size={14} />
            </button>
          )}
          {state.phase === "contents" && (
            <div className="book-spread book-contents">
              <div className="book-spread-intro">
                <span className="book-eyebrow">AN INVITATION TO EXPLORE</span>
                <h2 tabIndex={-1}>
                  Every page,
                  <br />
                  <em>a new perspective.</em>
                </h2>
                <p>
                  Seven Emirates, brought to life in paper. Explore any chapter
                  in any order. Environmental challenges and earned stamps are
                  optional achievements.
                </p>
                <span className="book-printer-mark">✳</span>
                <p className="book-small-print">
                  Every Emirate is open to everyone.
                  <br />
                  Teacher verification applies only to optional mission
                  achievements.
                </p>
              </div>
              <div className="book-contents-list">
                <span className="book-eyebrow">TABLE OF CONTENTS</span>
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    disabled={busy}
                    data-book-gesture="chapter"
                    onClick={() => select(i)}
                    aria-label={`Chapter ${c.order}: ${c.name}. ${stateName(i)}`}
                  >
                    <span className="book-chapter-number">
                      {String(c.order).padStart(2, "0")}
                    </span>
                    <span className="book-contents-name">
                      {c.name}
                      <small>{stateName(i)}</small>
                    </span>
                    <span aria-hidden="true">
                      {progress.completed[i] ? (
                        <Check size={17} />
                      ) : (
                        <ArrowRight size={17} />
                      )}
                    </span>
                  </button>
                ))}
                <p className="book-small-print">
                  {loading
                    ? "Optional mission information is loading. All Emirates remain open."
                    : error
                      ? "Optional missions are unavailable. You can still explore every Emirate."
                      : `${countText} optional achievements · Begin where curiosity takes you.`}
                </p>
                {error && (
                  <button onClick={refresh}>Reconnect optional missions</button>
                )}
              </div>
            </div>
          )}
          {(state.phase === "stamps" || state.phase === "final") && (
            <div className="book-spread book-collection">
              {state.phase === "final" && progress.count === 7 && (
                <span
                  className="book-completion-seal"
                  aria-label="Seven chapter completion seal"
                >
                  ✳<small>ALL SEVEN</small>
                </span>
              )}
              <div>
                <span className="book-eyebrow">
                  {state.phase === "final"
                    ? "SEVEN CHAPTERS. ONE SHARED FUTURE."
                    : "IMPRESSIONS OF A JOURNEY"}
                </span>
                <h2>
                  {state.phase === "final" && progress.count === 7
                    ? "Journey complete."
                    : "My travel stamps"}
                </h2>
                <p>
                  {state.phase === "final" && progress.count === 7
                    ? "You have explored all Seven Emirates and completed the full travel book."
                    : "A collection of discoveries, earned one thoughtful action at a time."}
                </p>
              </div>
              <div className="book-stamp-grid">
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    className={`book-stamp ${progress.completed[i] ? "is-collected" : ""}`}
                    disabled={busy}
                    data-book-gesture="chapter"
                    onClick={() => select(i)}
                    aria-label={`${c.name}: ${progress.completed[i] ? "Stamp collected. Revisit chapter" : "Not collected. Explore chapter"}`}
                  >
                    <img src={c.stamp} alt="" />
                    <strong>{c.name}</strong>
                    <small>
                      {progress.completed[i]
                        ? "MISSION COMPLETE"
                        : "NOT YET COLLECTED"}
                    </small>
                  </button>
                ))}
              </div>
              <p className="book-small-print">
                {countText} · Only verified or completed challenges earn stamps.
              </p>
              <div className="book-collection-actions">
                <button
                  className="book-button"
                  onClick={() => spread("contents")}
                >
                  View all chapters <ArrowRight size={16} />
                </button>
                {progress.count === 7 && (
                  <button
                    className="book-text-button"
                    data-book-gesture="chapter"
                    onClick={() => select(0)}
                  >
                    Replay the journey
                  </button>
                )}
              </div>
            </div>
          )}
          {inChapter && (
            <div
              className={`book-chapter-note ${state.phase === "reveal" ? "is-revealing" : ""}`}
              aria-hidden={state.phase === "reveal"}
              inert={state.phase === "reveal"}
            >
              <div>
                <span className="book-eyebrow">
                  CHAPTER {String(chapter.order).padStart(2, "0")}
                </span>
                <h2 ref={heading} tabIndex={-1}>
                  {chapter.name}
                </h2>
                <p>
                  {earned
                    ? `${chapter.name} Stamp Collected`
                    : chapter.description}
                </p>
              </div>
              <div className="book-chapter-actions">
                {error ? (
                  <>
                    <p>
                      Optional mission progress is unavailable. Explore freely;
                      your saved work is safe.
                    </p>
                    <button className="book-button" onClick={refresh}>
                      Refresh optional missions
                    </button>
                  </>
                ) : loading ? (
                  <p role="status">Loading optional mission details…</p>
                ) : !mission ? (
                  <p>This optional challenge has not been published yet.</p>
                ) : !student ? (
                  <>
                    <p>
                      {profile !== "guest"
                        ? "Chapter challenges are saved with a student account."
                        : "Explore the chapter. Sign in to save your discoveries."}
                    </p>
                    <Link
                      className="book-button"
                      href={
                        profile !== "guest"
                          ? "/dashboard"
                          : `/login?redirectTo=${encodeURIComponent(`/eco-journey?chapter=${chapter.id}`)}`
                      }
                    >
                      {profile !== "guest"
                        ? "My account"
                        : "Sign in for optional mission"}{" "}
                      <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      data-book-gesture="mission"
                      className={`book-button ${busy ? "is-disabled" : ""}`}
                      aria-disabled={busy}
                      tabIndex={busy ? -1 : 0}
                      href={mission ? chapter.route : "#"}
                      onClick={event => {
                        if (busy) event.preventDefault();
                        else
                          saveBook(
                            profile,
                            chapterIndex,
                            saved.current.seenStamps
                          );
                      }}
                    >
                      {earned
                        ? "Revisit challenge"
                        : missionStatus === "submitted" ||
                            missionStatus === "verification_required"
                          ? "View submitted challenge"
                          : missionStatus
                            ? "Continue challenge"
                            : "Start challenge"}{" "}
                      <ArrowRight size={16} />
                    </Link>
                    {earned && progress.count === 7 && chapterIndex === 6 && (
                      <button
                        className="book-text-button"
                        disabled={busy}
                        onClick={() => spread("final")}
                      >
                        Open the final spread <ArrowRight size={16} />
                      </button>
                    )}
                    {!earned &&
                      ["submitted", "verification_required"].includes(
                        missionStatus ?? ""
                      ) && (
                        <small>
                          Your teacher verifies this optional achievement. Every
                          Emirate remains open.
                        </small>
                      )}
                  </>
                )}
              </div>
              <nav
                className="book-chapter-navigation"
                aria-label="Explore Emirates"
              >
                {chapterIndex > 0 && (
                  <button
                    className="book-text-button"
                    disabled={busy}
                    data-book-gesture="chapter"
                    onClick={() => select(chapterIndex - 1)}
                  >
                    Previous Emirate
                  </button>
                )}
                {chapterIndex < chapters.length - 1 && (
                  <button
                    className="book-text-button"
                    disabled={busy}
                    data-book-gesture="chapter"
                    onClick={() => select(chapterIndex + 1)}
                  >
                    Next Emirate
                  </button>
                )}
              </nav>
              {earned && (
                <div
                  className="book-chapter-stamp"
                  aria-label={`${chapter.name} stamp collected`}
                >
                  <img src={chapter.stamp} alt="" />
                  <span>MISSION COMPLETE</span>
                </div>
              )}
            </div>
          )}
        </section>
        {state.phase !== "cover" && (
          <nav className="book-edge-tabs" aria-label="Emirate chapters">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                title={`${c.name}: ${stateName(i)}`}
                aria-label={`${c.name}: ${stateName(i)}`}
                aria-current={
                  inChapter && i === chapterIndex ? "page" : undefined
                }
                disabled={busy}
                data-book-gesture="chapter"
                onClick={() => select(i)}
                style={{ "--tab-color": c.accent } as React.CSSProperties}
              >
                <span>{String(c.order).padStart(2, "0")}</span>
                <span>{c.name}</span>
                {progress.completed[i] ? <Check size={12} /> : null}
              </button>
            ))}
          </nav>
        )}
      </div>
      {state.phase === "cover" && (
        <div className="book-cover-action">
          <p>Open the book and begin your journey through the Emirates.</p>
          <button
            data-book-gesture="open"
            className="book-button"
            onClick={open}
          >
            Open the book <ArrowRight size={17} />
          </button>
          <button className="book-text-button" onClick={open}>
            Preview chapters
          </button>
        </div>
      )}
      <footer className="book-footer">
        {frameMedia.error && (
          <span role="status">
            Frame media unavailable. The legacy book remains available.
          </span>
        )}
        <span>
          7 CHAPTERS <i>·</i> 7 CHALLENGES <i>·</i> 7 STAMPS
        </span>
        <span>
          {state.phase === "cover"
            ? "CRAFTED FOR A MORE THOUGHTFUL TOMORROW"
            : countText}
        </span>
      </footer>
      <div className="book-sr-only" role="status" aria-live="polite">
        {state.phase === "ready"
          ? `${chapter.name}. ${earned ? "Chapter complete. Stamp collected." : "Chapter ready."}`
          : state.phase === "contents"
            ? "Table of contents. Choose an available chapter."
            : state.phase === "stamping"
              ? `${chapter.name} stamp collected.`
              : state.phase === "final"
                ? "Journey complete. All seven stamps collected."
                : ""}
      </div>
    </main>
  );
}

function ChapterReveal({
  chapter,
  playing,
  onReady,
  onUnfold,
}: {
  chapter: (typeof chapters)[number];
  playing: boolean;
  onReady: () => void;
  onUnfold: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [showPoster, setShowPoster] = useState(!playing);
  const [waiting, setWaiting] = useState(playing);
  const callbacks = useRef({ onReady, onUnfold });
  callbacks.current = { onReady, onUnfold };
  useEffect(() => {
    const element = video.current;
    if (!playing || !element) {
      element?.pause();
      setShowPoster(true);
      setWaiting(false);
      callbacks.current.onReady();
      return;
    }
    let active = true;
    setShowPoster(false);
    const release = () => {
      if (active) {
        setShowPoster(true);
        setWaiting(false);
        callbacks.current.onReady();
      }
    };
    const deadline = gsap.delayedCall(8, release);
    const visibility = () => {
      if (document.hidden) {
        element.pause();
        deadline.pause();
      } else {
        deadline.resume();
        void element.play().catch(release);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    void element.play().catch(release);
    return () => {
      active = false;
      deadline.kill();
      element.pause();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing]);
  return (
    <div className="book-chapter-media">
      <img
        src={chapter.poster}
        alt={`A pop-up paper scene of ${chapter.name}`}
        fetchPriority="high"
        onError={event => {
          if (!event.currentTarget.src.endsWith("reference.webp"))
            event.currentTarget.src = chapter.reference;
        }}
      />
      <video
        ref={video}
        src={chapter.video}
        poster={chapter.poster}
        playsInline
        muted
        preload="auto"
        controls={false}
        disablePictureInPicture
        aria-hidden="true"
        style={{ opacity: showPoster ? 0 : 1 }}
        onPlaying={() => {
          setWaiting(false);
          callbacks.current.onUnfold();
        }}
        onEnded={() => {
          setShowPoster(true);
          callbacks.current.onReady();
        }}
        onError={() => {
          setShowPoster(true);
          callbacks.current.onReady();
        }}
      />
      {waiting && (
        <p className="book-media-loading" role="status">
          Unfolding {chapter.name}…
        </p>
      )}
    </div>
  );
}
