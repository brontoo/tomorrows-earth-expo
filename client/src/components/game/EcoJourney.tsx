import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAuthContext } from "@/contexts/AuthContext";
import { initFloatingParallax } from "./animations";
import { init3DPod } from "./threeScene";
import {
  journalSfx,
  prefersReducedMotion,
  unlockJourneyAudio,
} from "@/lib/journalMotion";
import mascot from "@/assets/illustrations/tree.svg";
import LivingTrainCabin from "./train/LivingTrainCabin";
import BoardingPlatform from "./intro/BoardingPlatform";
import JourneyBriefing from "./intro/JourneyBriefing";
import { preloadBoardingAssets } from "./intro/boardingAssets";
import { readJourney, saveJourney } from "./train/persistence";
import "./intro/boarding.css";
import { gameBeats, gameEase } from "./motion/gameMotion";
import "./motion/gameMotion.css";
import { EntryBrand } from "@/components/entry/EntryScene";
import { ArrowRight, Compass, Leaf, Volume2, VolumeX } from "lucide-react";
import "./intro/journeyIntro.css";

export default function EcoJourney() {
  const { user } = useAuthContext();
  const profile = user?.id ? String(user.id) : "guest";
  const [entry, setEntry] = useState<
    "intro" | "platform" | "entering" | "revealing" | "cabin"
  >(() => (readJourney(profile).boarded ? "cabin" : "intro"));
  const [cabinReady, setCabinReady] = useState(false);
  const cabinEntry = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (entry === "cabin")
      cabinEntry.current
        ?.querySelector<HTMLHeadingElement>("h1")
        ?.focus({ preventScroll: true });
  }, [entry]);
  useEffect(() => {
    setCabinReady(false);
    setEntry(current =>
      readJourney(profile).boarded
        ? "cabin"
        : current === "cabin"
          ? "intro"
          : current
    );
  }, [profile]);
  const cabinMounted =
    entry === "entering" || entry === "revealing" || entry === "cabin";
  return (
    <div className="eco-entry-flow">
      {cabinMounted && (
        <div
          ref={cabinEntry}
          className="eco-entry-cabin"
          aria-hidden={entry !== "cabin"}
          inert={entry !== "cabin"}
        >
          <LivingTrainCabin
            entryHeld={entry === "entering"}
            onReady={() => setCabinReady(true)}
          />
        </div>
      )}
      {entry === "intro" && (
        <JourneyOpening
          onBoard={() => {
            journalSfx.chime();
            setCabinReady(false);
            setEntry("platform");
          }}
        />
      )}
      {(entry === "platform" ||
        entry === "entering" ||
        entry === "revealing") && (
        <BoardingPlatform
          cabinReady={cabinReady}
          onPrepareCabin={() => setEntry("entering")}
          onReveal={() => setEntry("revealing")}
          onEntered={() => {
            saveJourney(profile, readJourney(profile).station);
            setEntry("cabin");
          }}
        />
      )}
    </div>
  );
}

function JourneyOpening({ onBoard }: { onBoard: () => void }) {
  const containerRef = useRef<HTMLElement>(null);
  const [soundMuted, setSoundMuted] = useState(journalSfx.muted);
  const [story, setStory] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const openingMotion = useRef<gsap.core.Timeline | null>(null);
  const storyTimeline = useRef<gsap.core.Timeline | null>(null);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const board = useRef(onBoard);
  board.current = onBoard;

  useEffect(() => {
    const pod = document.getElementById("pod-container") as HTMLDivElement;
    let dispose: (() => void) | undefined;
    try {
      dispose = init3DPod(pod, () => setModelUnavailable(true));
    } catch {
      setModelUnavailable(true);
    }
    const reduced = prefersReducedMotion();
    const stopParallax = reduced
      ? undefined
      : initFloatingParallax(".floating-asteroid");
    return () => {
      dispose?.();
      stopParallax?.();
    };
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const entrance = gsap.timeline();
      openingMotion.current = entrance;
      entrance.fromTo(
        ".hero-content",
        { opacity: 0, y: 18, rotation: -0.6 },
        {
          opacity: 1,
          y: 0,
          rotation: 0,
          duration: 0.85,
          ease: gameEase.arrive,
        },
        0
      );
      entrance.fromTo(
        ".hero-title .intro-line > span",
        { yPercent: 110, rotation: 2 },
        {
          yPercent: 0,
          rotation: 0,
          duration: gameBeats.reveal,
          stagger: gameBeats.word,
          ease: gameEase.arrive,
        },
        0.12
      );
      entrance.fromTo(
        ".intro-journey-line, .hero-content > p:not(.intro-journey-line), #start-btn, .intro-ticket-motif",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.09,
          ease: gameEase.arrive,
        },
        0.35
      );
    }, containerRef);
    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    if (!story) return;
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      const timeline = gsap.timeline();
      storyTimeline.current = timeline;
      const beats = gameBeats.intro;
      timeline.to(
        "#hero-content",
        {
          opacity: 0,
          y: reduced ? 0 : -12,
          duration: reduced ? 0.1 : gameBeats.exit,
          ease: gameEase.leave,
        },
        0
      );
      timeline.to(
        "#character-group",
        {
          y: 0,
          scale: 1.025,
          duration: reduced ? 0.1 : 0.95,
          ease: gameEase.travel,
        },
        0
      );
      timeline.to("#progress-container", { opacity: 1, duration: 0.45 }, 0.3);
      const groups = Array.from(
        containerRef.current?.querySelectorAll(".story-slide-group") ?? []
      );
      const starts = [beats.guide, beats.mission, beats.briefing];
      groups.forEach((group, index) => {
        const at = starts[index];
        timeline.addLabel(
          index === 2 ? "travelBriefing" : `briefing-${index}`,
          at
        );
        timeline.call(() => setActiveSlide(index), [], at);
        timeline.set(group, { opacity: 1 }, at);
        if (index === 2) {
          timeline.to(
            "#character-group",
            {
              opacity: 0,
              y: reduced ? 0 : -10,
              duration: reduced ? 0.1 : 0.36,
              ease: gameEase.leave,
            },
            at - 0.35
          );
          timeline.fromTo(
            ".intro-journey-brief",
            { opacity: 0, y: reduced ? 0 : 24, rotation: reduced ? 0 : 0.6 },
            {
              opacity: 1,
              y: 0,
              rotation: 0,
              duration: reduced ? 0.1 : 0.85,
              ease: gameEase.arrive,
            },
            at
          );
          timeline.fromTo(
            ".intro-uae-map",
            { opacity: 0, scale: reduced ? 1 : 0.96 },
            {
              opacity: 1,
              scale: 1,
              duration: reduced ? 0.1 : 0.8,
              ease: gameEase.arrive,
            },
            at + 0.2
          );
          timeline.fromTo(
            ".intro-seven-stops li",
            { opacity: 0, y: reduced ? 0 : 10 },
            {
              opacity: 1,
              y: 0,
              duration: reduced ? 0.1 : 0.5,
              stagger: reduced ? 0 : gameBeats.station,
              ease: gameEase.arrive,
            },
            at + 0.5
          );
          timeline.fromTo(
            ".intro-platform-link",
            { opacity: 0, y: reduced ? 0 : 6 },
            { opacity: 1, y: 0, duration: 0.45, ease: gameEase.arrive },
            at + 1
          );
        }
        timeline.fromTo(
          group.querySelectorAll(
            ".story-title, .story-desc, .journey-guide-name"
          ),
          {
            opacity: 0,
            y: reduced ? 0 : 16,
            clipPath: reduced ? "none" : "inset(0 0 100% 0)",
          },
          {
            opacity: 1,
            y: 0,
            clipPath: reduced ? "none" : "inset(-10% -2% -15% -2%)",
            duration: reduced ? 0.1 : gameBeats.reveal,
            stagger: reduced ? 0 : 0.14,
            ease: gameEase.arrive,
          },
          at + (index === 2 ? 0.18 : 0)
        );
        const out =
          index === 2 ? beats.platform - 0.42 : starts[index + 1] - 0.38;
        timeline.to(
          group,
          {
            opacity: 0,
            y: reduced ? 0 : -8,
            duration: reduced ? 0.1 : gameBeats.exit,
            ease: gameEase.leave,
          },
          out
        );
      });
      timeline.call(() => board.current(), [], beats.platform);
      const visibility = () => {
        if (document.hidden) timeline.pause();
        else timeline.resume();
      };
      document.addEventListener("visibilitychange", visibility);
      return () => document.removeEventListener("visibilitychange", visibility);
    }, containerRef);
    return () => {
      context.revert();
      storyTimeline.current = null;
    };
  }, [story]);

  const startStory = () => {
    if (story) return;
    openingMotion.current?.progress(1).kill();
    unlockJourneyAudio();
    journalSfx.stamp();
    setStory(true);
    // Begin staged decoding before the player reaches the final travel briefing.
    void preloadBoardingAssets().catch(() => undefined);
  };
  return (
    <section
      ref={containerRef}
      className="hero-section eco-travel-intro journey-intro"
      data-story={story}
      data-briefing={story && activeSlide === 2}
    >
      <header className="journey-intro-header">
        <EntryBrand />
        <button
          type="button"
          className="journey-sound"
          aria-label={soundMuted ? "Unmute sound" : "Mute sound"}
          aria-pressed={!soundMuted}
          onClick={() => setSoundMuted(journalSfx.toggle())}
        >
          {soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          <span>{soundMuted ? "Sound off" : "Sound on"}</span>
        </button>
      </header>
      <div className="journey-intro-stage">
        <div
          className="hero-content"
          id="hero-content"
          aria-hidden={story}
          inert={story}
        >
          <span className="journey-kicker">
            <span /> THE SEVEN EMIRATES JOURNEY
          </span>
          <h1 className="hero-title">
            <span className="intro-line">
              <span>Explore the UAE.</span>
            </span>
            <span className="intro-line">
              <span>
                Protect <em>our future.</em>
              </span>
            </span>
          </h1>
          <p className="intro-journey-line">
            A journey across the Seven Emirates begins here.
          </p>
          <p className="journey-school">
            Um Al Emarat School · Teacher: Riham Saleh
          </p>
          <button
            className="cta-button"
            id="start-btn"
            aria-label="Board the Eco Train"
            onClick={startStory}
          >
            Board the Eco Train <ArrowRight size={19} aria-hidden="true" />
          </button>
          <div className="intro-ticket-motif">
            <span>7 EMIRATES</span>
            <i />
            <span>7 STOPS</span>
            <i />
            <span>ONE SHARED FUTURE</span>
          </div>
        </div>
        <div
          id="character-group"
          className="journey-guide-stage"
          aria-hidden="true"
        >
          <div className="journey-guide-arch" />
          <span className="journey-orbit floating-asteroid" data-speed=".05">
            <Compass size={30} strokeWidth={1} />
          </span>
          <span className="journey-leaf floating-asteroid" data-speed=".08">
            <Leaf size={30} strokeWidth={1} />
          </span>
          <div id="pod-container" className="journey-guide-model" />
          {modelUnavailable && (
            <img className="journey-guide-fallback" src={mascot} alt="" />
          )}
          <div className="journey-guide-label">
            <span>YOUR TRAVEL COMPANION</span>
            <strong>Good things grow with a little curiosity.</strong>
          </div>
        </div>
        <div id="story-container">
          <div
            className="story-slide-group"
            aria-hidden={!story || activeSlide !== 0}
            inert={!story || activeSlide !== 0}
          >
            <span className="journey-kicker">01 / MEET YOUR COMPANION</span>
            <h2 className="story-title">
              Meet
              <br />
              <em>Bu Ghosn.</em>
            </h2>
            <span className="journey-guide-name">بوغصن</span>
            <p className="story-desc">Your eco-guide and travel companion.</p>
            <div className="journey-story-note">
              <Leaf size={17} strokeWidth={1.4} />
              <span>A curious friend. A greener future.</span>
            </div>
          </div>
          <div
            className="story-slide-group"
            aria-hidden={!story || activeSlide !== 1}
            inert={!story || activeSlide !== 1}
          >
            <span className="journey-kicker">02 / A MISSION WORTH TAKING</span>
            <h2 className="story-title">
              Help Bu Ghosn
              <br />
              protect <em>the UAE.</em>
            </h2>
            <p className="story-desc">
              Travel, explore, solve challenges, and collect 7 station stamps.
            </p>
            <div className="journey-story-note">
              <Compass size={17} strokeWidth={1.4} />
              <span>Small actions. A lasting impact.</span>
            </div>
          </div>
          <div
            id="journey-briefing"
            className="story-slide-group intro-map-slide"
            aria-hidden={!story || activeSlide !== 2}
            inert={!story || activeSlide !== 2}
          >
            <JourneyBriefing onContinue={() => board.current()} />
          </div>
        </div>
      </div>
      <footer className="journey-intro-footer">
        <nav
          className="progress-container intro-track-progress"
          id="progress-container"
          aria-label="Introduction progress"
          aria-hidden={!story}
        >
          <ol>
            {["Meet your guide", "Mission briefing", "Travel briefing"].map(
              (label, index) => (
                <li
                  key={label}
                  aria-current={
                    story && activeSlide === index ? "step" : undefined
                  }
                  data-complete={activeSlide > index}
                >
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </li>
              )
            )}
          </ol>
        </nav>
        {!story && (
          <span className="journey-footer-note">
            A SMALL STEP. A LASTING IMPACT.
          </span>
        )}
        {story && activeSlide < 2 && (
          <button
            className="train-take-seat"
            onClick={() => storyTimeline.current?.seek("travelBriefing", false)}
          >
            Travel briefing <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
        {story && activeSlide === 2 && (
          <span className="journey-footer-note">
            YOUR NEXT CHAPTER IS READY.
          </span>
        )}
      </footer>
    </section>
  );
}
