import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  existingJourneyAudio,
  journalSfx,
  prefersReducedMotion,
  unlockJourneyAudio,
} from "@/lib/journalMotion";
import { boardingArtwork, preloadBoardingAssets } from "./boardingAssets";
import { gameBeats, gameEase } from "../motion/gameMotion";
import { EntryBrand } from "@/components/entry/EntryScene";
import { Volume2, VolumeX } from "lucide-react";
import { PlatformAmbience } from "./PlatformAmbience";

export default function BoardingPlatform({
  cabinReady,
  onPrepareCabin,
  onReveal,
  onEntered,
}: {
  cabinReady: boolean;
  onPrepareCabin: () => void;
  onReveal: () => void;
  onEntered: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const boardButton = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const ambience = useRef<PlatformAmbience | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [phase, setPhase] = useState<
    "waiting" | "boarding" | "covered" | "revealing"
  >("waiting");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(journalSfx.muted);
  const [attention, setAttention] = useState(false);
  const callbacks = useRef({ onPrepareCabin, onReveal, onEntered });
  callbacks.current = { onPrepareCabin, onReveal, onEntered };

  useEffect(() => {
    let active = true;
    void preloadBoardingAssets()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useLayoutEffect(() => {
    if (!ready) return;
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      entrance.current = gsap
        .timeline({ defaults: { ease: gameEase.arrive } })
        .fromTo(
          art.current,
          { scale: reduced ? 1 : 1.035, opacity: 0 },
          { scale: 1, opacity: 1, duration: reduced ? 0.1 : 0.95 },
          0
        )
        .fromTo(
          ".boarding-platform-header > *",
          { opacity: 0, y: reduced ? 0 : -8 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 },
          0.15
        )
        .fromTo(
          ".boarding-invitation",
          { opacity: 0, y: reduced ? 0 : 16, rotation: reduced ? 0 : -0.5 },
          { opacity: 1, y: 0, rotation: 0, duration: reduced ? 0.1 : 0.75 },
          0.25
        )
        .fromTo(
          ".boarding-invitation > *",
          { opacity: 0, y: reduced ? 0 : 9 },
          {
            opacity: 1,
            y: 0,
            duration: reduced ? 0.1 : 0.55,
            stagger: reduced ? 0 : 0.09,
          },
          0.38
        );
    }, root);
    return () => context.revert();
  }, [ready]);
  useEffect(() => {
    if (ready && phase === "waiting")
      boardButton.current?.focus({ preventScroll: true });
  }, [ready, phase]);
  useEffect(() => {
    const context = existingJourneyAudio();
    if (context) ambience.current = new PlatformAmbience(context);
    const sync = () => {
      setMuted(journalSfx.muted);
      ambience.current?.setMuted(journalSfx.muted || document.hidden);
    };
    sync();
    window.addEventListener("eco-sound-preference", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      timeline.current?.kill();
      ambience.current?.dispose();
      ambience.current = null;
      window.removeEventListener("eco-sound-preference", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    if (phase !== "covered" || !cabinReady || !cover.current) return;
    setPhase("revealing");
    callbacks.current.onReveal();
    ambience.current?.fadeIntoCabin();
    timeline.current = gsap
      .timeline({ onComplete: () => callbacks.current.onEntered() })
      .to(cover.current, {
        clipPath: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
        duration: prefersReducedMotion() ? 0.16 : gameBeats.boarding.reveal,
        ease: gameEase.travel,
      });
  }, [phase, cabinReady]);
  const enableAudio = () => {
    const context = unlockJourneyAudio();
    if (context && !ambience.current)
      ambience.current = new PlatformAmbience(context);
    return context;
  };
  const toggleSound = () => {
    enableAudio();
    journalSfx.setMuted(!journalSfx.muted);
    setMuted(journalSfx.muted);
    ambience.current?.setMuted(journalSfx.muted);
  };
  const board = () => {
    if (
      started.current ||
      phase !== "waiting" ||
      !ready ||
      !art.current ||
      !cover.current
    )
      return;
    started.current = true;
    entrance.current?.progress(1).kill();
    enableAudio();
    ambience.current?.confirm(
      gameBeats.boarding.doorwayAt + gameBeats.boarding.cover
    );
    ambience.current?.setMuted(journalSfx.muted);
    setPhase("boarding");
    setAttention(false);
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline();
    timeline.current = tl;
    tl.to(
      ".boarding-invitation",
      {
        opacity: 0,
        y: reduced ? 0 : -6,
        duration: reduced ? 0.08 : gameBeats.boarding.inviteOut,
        ease: gameEase.leave,
      },
      0
    );
    tl.to(".boarding-platform-header", { opacity: 0, duration: 0.18 }, 0.06);
    tl.to(
      art.current,
      {
        scale: reduced ? 1 : 1.16,
        transformOrigin: `${boardingArtwork.doorway.x * 100}% ${boardingArtwork.doorway.y * 100}%`,
        duration: reduced ? 0.1 : gameBeats.boarding.push + 0.25,
        ease: gameEase.travel,
      },
      0
    );
    tl.call(
      () => {
        const bounds = art.current!.getBoundingClientRect();
        const point = (x: number, y: number) =>
          `${((bounds.x + bounds.width * x) / innerWidth) * 100}% ${((bounds.y + bounds.height * y) / innerHeight) * 100}%`;
        gsap.set(cover.current, {
          opacity: 1,
          clipPath: reduced
            ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
            : `polygon(${point(0.63, 0.235)}, ${point(0.757, 0.17)}, ${point(0.757, 0.97)}, ${point(0.63, 0.795)})`,
        });
      },
      [],
      reduced ? 0.1 : gameBeats.boarding.doorwayAt
    );
    tl.to(
      cover.current,
      {
        clipPath: "polygon(-5% -5%, 105% -5%, 105% 105%, -5% 105%)",
        duration: reduced ? 0.16 : gameBeats.boarding.cover,
        ease: gameEase.travel,
      },
      reduced ? 0.1 : gameBeats.boarding.doorwayAt
    );
    tl.call(() => {
      setPhase("covered");
      callbacks.current.onPrepareCabin();
    });
  };

  return (
    <section
      ref={root}
      className={`boarding-platform is-${phase} ${attention ? "is-inviting" : ""}`}
      aria-label="Eco Train boarding platform"
    >
      <div
        className="boarding-platform-art"
        aria-hidden={phase === "revealing"}
      >
        <div ref={art} className="boarding-platform-camera">
          {ready && (
            <img
              src={boardingArtwork.src}
              alt="Bu Ghosn welcomes you beside the open door of the Eco Train at a UAE station platform"
              draggable={false}
            />
          )}
          <div className="boarding-door-glow" aria-hidden="true" />
        </div>
      </div>
      <div className="boarding-platform-header" inert={phase !== "waiting"}>
        <EntryBrand />
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
      <div
        className="boarding-invitation"
        aria-hidden={phase !== "waiting"}
        inert={phase !== "waiting"}
      >
        <span className="intro-annotation">YOUR TRAIN IS WAITING</span>
        <h1>All aboard.</h1>
        <p>Your journey across the Seven Emirates begins now.</p>
        {failed ? (
          <>
            <p role="status">The platform view could not be loaded.</p>
            <button
              className="boarding-cta"
              onClick={() => {
                setFailed(false);
                setAttempt(value => value + 1);
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <button
            ref={boardButton}
            type="button"
            className="boarding-cta"
            disabled={!ready}
            onClick={board}
            onMouseEnter={() => setAttention(true)}
            onMouseLeave={() => setAttention(false)}
            onFocus={() => setAttention(true)}
            onBlur={() => setAttention(false)}
            aria-label="Board the Eco Train"
          >
            {ready ? "BOARD NOW" : "Preparing your platform…"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      <div ref={cover} className="boarding-door-cover" aria-hidden="true" />
      {(phase === "covered" || phase === "revealing") && (
        <p className="boarding-status" role="status">
          Taking your seat…
        </p>
      )}
    </section>
  );
}
