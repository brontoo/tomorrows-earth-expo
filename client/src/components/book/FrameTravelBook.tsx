import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { chapters, chapterProgress } from "./chapters";
import { useBookProgress } from "./useBookProgress";
import { readBook, saveBook } from "./persistence";
import { useFrameManifest } from "./frames/useFrameManifest";
import FrameBookPlayer from "./frames/FrameBookPlayer";
import {
  startBookDiagnostics,
  stopBookDiagnostics,
} from "./frames/FrameDiagnostics";
import GestureControls from "./gestures/GestureControls";
import { frameBookMediaConfig } from "./frames/frameBookMediaConfig";
import type { BookFrameInput } from "./gestures/BookGestureController";
import "./book.css";
import "./frames/frames.css";

/** /eco-journey only. Education consumes displayed chapter; it never controls the timeline. */
export default function FrameTravelBook() {
  const education = useBookProgress();
  useEffect(() => {
    startBookDiagnostics();
    return stopBookDiagnostics;
  }, []);
  const [attempt, setAttempt] = useState(0);
  const mediaConfig = frameBookMediaConfig({
    VITE_BOOK_ASSET_BASE_URL: import.meta.env.VITE_BOOK_ASSET_BASE_URL,
    VITE_BOOK_MEDIA_VERSION: import.meta.env.VITE_BOOK_MEDIA_VERSION,
  });
  const media = useFrameManifest(
    true,
    mediaConfig.baseUrl,
    mediaConfig.version,
    attempt
  );
  const scope = useRef<HTMLElement>(null),
    input = useRef<BookFrameInput | null>(null);
  const requested = chapters.findIndex(
    c => c.id === new URLSearchParams(location.search).get("chapter")
  );
  const initialChapter = useRef(requested);
  const [chapter, setChapter] = useState(Math.max(0, requested));
  const [painted, setPainted] = useState(false);
  const [atCover, setAtCover] = useState(true);
  const coverRef = useRef(true);
  const [navigation, setNavigation] = useState<{
    serial: number;
    frame: number;
  }>();
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
  const achievement = chapterProgress(education.missions, education.states);
  const active = chapters[chapter];
  const mission = education.missions.find(m => m.slug === active.missionSlug);
  const status = education.states.find(
    s => s.missionId === mission?.id
  )?.status;
  useEffect(() => {
    if (painted)
      saveBook(
        education.profile,
        chapter,
        readBook(education.profile).seenStamps
      );
  }, [education.profile, chapter, painted]);
  const jump = (index: number) => {
    const frame = media.manifest?.chapters[index]?.restingFrame;
    if (frame !== undefined)
      setNavigation(old => ({ serial: (old?.serial ?? 0) + 1, frame }));
  };
  return (
    <main
      ref={scope}
      className="travel-book book-continuous"
      data-book-engine="frames"
      id="main-content"
    >
      <a className="book-skip-link" href="#book-content">
        Skip to book content
      </a>
      <header className="book-header">
        <Link href="/" className="book-wordmark">
          <BookOpen size={21} />
          <span>
            THE SEVEN EMIRATES<small>A JOURNEY TO KEEP</small>
          </span>
        </Link>
        <nav aria-label="Platform navigation">
          <Link href="/my-journey">
            My travel stamps <span>{achievement.count}/7</span>
          </Link>
          <Link href="/innovation-hub">Projects</Link>
        </nav>
      </header>
      <GestureControls scope={scope} input={input} />
      <div className="book-stage-wrap" id="book-content">
        <section
          className="book-stage"
          aria-label="Continuous Full HD travel book"
        >
          {media.manifest ? (
            <FrameBookPlayer
              manifest={media.manifest}
              baseUrl={media.baseUrl}
              chapter={chapter}
              reduced={reduced}
              interactive
              initialFrame={
                initialChapter.current >= 0
                  ? media.manifest.chapters[initialChapter.current].restingFrame
                  : 0
              }
              firstFrameUrl={media.firstFrameUrl}
              initialFrameBytes={media.initialFrameBytes}
              navigation={navigation}
              followChapterProp={false}
              gestureInput={input}
              onChapter={id => {
                const index = chapters.findIndex(c => c.id === id);
                if (index >= 0) setChapter(index);
              }}
              onFrameDisplayed={frame => {
                const next = frame === 0;
                if (next !== coverRef.current) {
                  coverRef.current = next;
                  setAtCover(next);
                }
              }}
              onReady={() => setPainted(true)}
              onFallback={() => {}}
            />
          ) : (
            <div className="book-original-loading" role="status">
              {media.error ? (
                <>
                  <p>{media.error}</p>
                  <button type="button" onClick={() => setAttempt(n => n + 1)}>
                    Retry original book
                  </button>
                </>
              ) : (
                <p>Loading the original Full HD closed book…</p>
              )}
            </div>
          )}
        </section>
        <nav className="book-compact-chapters" aria-label="Jump to any Emirate">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-book-gesture="chapter"
              aria-current={painted && chapter === i ? "page" : undefined}
              onClick={() => jump(i)}
            >
              {c.name}
            </button>
          ))}
        </nav>
        {!atCover && (
          <section
            className="book-chapter-note book-optional-mission"
            aria-label="Optional educational mission"
          >
            <div>
              <span className="book-eyebrow">
                {`CHAPTER ${String(chapter + 1).padStart(2, "0")}`}
              </span>
              <h1>{active.name}</h1>
              <p>
                Explore every Emirate freely. Missions and earned stamps are
                optional achievements.
              </p>
            </div>
            <div className="book-chapter-actions">
              {education.loading ? (
                <p>Loading optional mission details…</p>
              ) : education.error ? (
                <>
                  <p>
                    Optional missions are unavailable. Every Emirate remains
                    open.
                  </p>
                  <button onClick={education.refresh}>
                    Refresh optional missions
                  </button>
                </>
              ) : !education.student ? (
                <Link
                  href={
                    education.profile !== "guest"
                      ? "/dashboard"
                      : `/login?redirectTo=${encodeURIComponent(`/eco-journey?chapter=${active.id}`)}`
                  }
                >
                  {education.profile !== "guest"
                    ? "My account"
                    : "Sign in for optional missions"}
                </Link>
              ) : mission ? (
                <>
                  <p>Mission status: {status ?? "Not started"}</p>
                  <Link data-book-gesture="mission" href={active.route}>
                    View optional challenge
                  </Link>
                </>
              ) : (
                <p>This optional challenge has not been published yet.</p>
              )}
              {achievement.completed[chapter] && (
                <p
                  className="book-earned-achievement"
                  aria-label={`${active.name} stamp collected`}
                >
                  Mission stamp earned
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
