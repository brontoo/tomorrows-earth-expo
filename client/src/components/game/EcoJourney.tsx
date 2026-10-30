import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAuthContext } from "@/contexts/AuthContext";
import { initFloatingParallax, initConstellationCanvas } from "./animations";
import { init3DPod } from "./threeScene";
import { journalSfx, prefersReducedMotion, unlockJourneyAudio } from "@/lib/journalMotion";
import mascot from "@/assets/illustrations/tree.svg";
import LivingTrainCabin from "./train/LivingTrainCabin";
import BoardingPlatform from "./intro/BoardingPlatform";
import JourneyBriefing from "./intro/JourneyBriefing";
import { preloadBoardingAssets } from "./intro/boardingAssets";
import { readJourney, saveJourney } from "./train/persistence";
import "./EcoJourney.css";
import "./fieldJournal.css";
import "./intro/boarding.css";
import { gameBeats, gameEase } from "./motion/gameMotion";
import "./motion/gameMotion.css";
import p1 from "../../assets/illustrations/p1.png";
import p2 from "../../assets/illustrations/p2.png";
import p3 from "../../assets/illustrations/p3.png";
import p4 from "../../assets/illustrations/p4.png";
import p5 from "../../assets/illustrations/p5.png";
import p6 from "../../assets/illustrations/p6.png";

export default function EcoJourney() {
  const { user } = useAuthContext();
  const profile = user?.id ? String(user.id) : "guest";
  const [entry, setEntry] = useState<'intro' | 'platform' | 'entering' | 'revealing' | 'cabin'>(() => readJourney(profile).boarded ? 'cabin' : 'intro');
  const [cabinReady, setCabinReady] = useState(false);
  const cabinEntry = useRef<HTMLDivElement>(null);
  useEffect(() => { if (entry === 'cabin') cabinEntry.current?.querySelector<HTMLHeadingElement>('h1')?.focus({ preventScroll: true }); }, [entry]);
  useEffect(() => {
    setCabinReady(false);
    setEntry(current => readJourney(profile).boarded ? 'cabin' : current === 'cabin' ? 'intro' : current);
  }, [profile]);
  const cabinMounted = entry === 'entering' || entry === 'revealing' || entry === 'cabin';
  return <div className="eco-entry-flow">
    {cabinMounted && <div ref={cabinEntry} className="eco-entry-cabin" aria-hidden={entry !== 'cabin'} inert={entry !== 'cabin'}>
      <LivingTrainCabin entryHeld={entry === 'entering'} onReady={() => setCabinReady(true)} />
    </div>}
    {entry === 'intro' && <JourneyOpening onBoard={() => { journalSfx.chime(); setCabinReady(false); setEntry('platform'); }} />}
    {(entry === 'platform' || entry === 'entering' || entry === 'revealing') && <BoardingPlatform
      cabinReady={cabinReady} onPrepareCabin={() => setEntry('entering')} onReveal={() => setEntry('revealing')}
      onEntered={() => { saveJourney(profile, readJourney(profile).station); setEntry('cabin'); }} />}
  </div>;
}

function JourneyOpening({ onBoard }: { onBoard: () => void }) {
  const containerRef = useRef<HTMLElement>(null);
  const [soundMuted, setSoundMuted] = useState(journalSfx.muted);
  const [story, setStory] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const openingMotion = useRef<gsap.core.Timeline | null>(null);
  const storyTimeline = useRef<gsap.core.Timeline | null>(null);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const board = useRef(onBoard); board.current = onBoard;

  useEffect(() => {
    const pod = document.getElementById("pod-container") as HTMLDivElement;
    let dispose: (() => void) | undefined;
    try { dispose = init3DPod(pod); } catch { setModelUnavailable(true); }
    const reduced = prefersReducedMotion();
    const stopParallax = reduced ? undefined : initFloatingParallax(".floating-asteroid");
    const canvas = document.getElementById("star-canvas") as HTMLCanvasElement;
    const stopStars = initConstellationCanvas(canvas, [{ x: innerWidth * .2, y: innerHeight * .3 }, { x: innerWidth * .8, y: innerHeight * .2 }]);
    return () => { dispose?.(); stopParallax?.(); stopStars?.(); };
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const entrance = gsap.timeline(); openingMotion.current = entrance;
      entrance.fromTo('.hero-content', { opacity: 0, y: 18, rotation: -.6 },
        { opacity: 1, y: 0, rotation: 0, duration: .85, ease: gameEase.arrive }, 0);
      entrance.fromTo('.hero-title .intro-line > span', { yPercent: 110, rotation: 2 },
        { yPercent: 0, rotation: 0, duration: gameBeats.reveal, stagger: gameBeats.word, ease: gameEase.arrive }, .12);
      entrance.fromTo('.intro-journey-line, .hero-content > p:not(.intro-journey-line), #start-btn, .intro-ticket-motif',
        { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, stagger: .09, ease: gameEase.arrive }, .35);
    }, containerRef);
    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    if (!story) return;
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      const timeline = gsap.timeline(); storyTimeline.current = timeline;
      const beats = gameBeats.intro;
      timeline.to('#hero-content', { opacity: 0, y: reduced ? 0 : -12, duration: reduced ? .1 : gameBeats.exit, ease: gameEase.leave }, 0);
      timeline.to('#character-group', { y: '-10vh', scale: 1.1, duration: reduced ? .1 : .95, ease: gameEase.travel }, 0);
      timeline.to('#progress-container', { opacity: 1, duration: .45 }, .3);
      const groups = Array.from(containerRef.current?.querySelectorAll('.story-slide-group') ?? []);
      const starts = [beats.guide, beats.mission, beats.briefing];
      groups.forEach((group, index) => {
        const at = starts[index];
        timeline.addLabel(index === 2 ? 'travelBriefing' : `briefing-${index}`, at);
        timeline.call(() => setActiveSlide(index), [], at);
        timeline.set(group, { opacity: 1 }, at);
        if (index === 2) {
          timeline.to('#character-group', { opacity: 0, y: reduced ? '-10vh' : '-13vh', duration: reduced ? .1 : .36, ease: gameEase.leave }, at - .35);
          timeline.fromTo('.intro-journey-brief', { opacity: 0, y: reduced ? 0 : 24, rotation: reduced ? 0 : .6 },
            { opacity: 1, y: 0, rotation: 0, duration: reduced ? .1 : .85, ease: gameEase.arrive }, at);
          timeline.fromTo('.intro-uae-map', { opacity: 0, scale: reduced ? 1 : .96 },
            { opacity: 1, scale: 1, duration: reduced ? .1 : .8, ease: gameEase.arrive }, at + .2);
          timeline.fromTo('.intro-seven-stops li', { opacity: 0, y: reduced ? 0 : 10 },
            { opacity: 1, y: 0, duration: reduced ? .1 : .5, stagger: reduced ? 0 : gameBeats.station, ease: gameEase.arrive }, at + .5);
          timeline.fromTo('.intro-platform-link', { opacity: 0, y: reduced ? 0 : 6 },
            { opacity: 1, y: 0, duration: .45, ease: gameEase.arrive }, at + 1);
        }
        timeline.fromTo(group.querySelectorAll('.story-title, .story-desc'),
          { opacity: 0, y: reduced ? 0 : 16, clipPath: reduced ? 'none' : 'inset(0 0 100% 0)' },
          { opacity: 1, y: 0, clipPath: reduced ? 'none' : 'inset(-10% -2% -15% -2%)', duration: reduced ? .1 : gameBeats.reveal,
            stagger: reduced ? 0 : .14, ease: gameEase.arrive }, at + (index === 2 ? .18 : 0));
        const out = index === 2 ? beats.platform - .42 : starts[index + 1] - .38;
        timeline.to(group, { opacity: 0, y: reduced ? 0 : -8, duration: reduced ? .1 : gameBeats.exit, ease: gameEase.leave }, out);
      });
      timeline.call(() => board.current(), [], beats.platform);
      const visibility = () => { if (document.hidden) timeline.pause(); else timeline.resume(); };
      document.addEventListener('visibilitychange', visibility);
      return () => document.removeEventListener('visibilitychange', visibility);
    }, containerRef);
    return () => { context.revert(); storyTimeline.current = null; };
  }, [story]);

  const startStory = () => {
    if (story) return;
    openingMotion.current?.progress(1).kill();
    unlockJourneyAudio(); journalSfx.stamp();
    setStory(true);
    // Begin staged decoding before the player reaches the final travel briefing.
    void preloadBoardingAssets().catch(() => undefined);
  };
  return (
    <section ref={containerRef} className="hero-section eco-travel-intro" data-briefing={story && activeSlide === 2}>
      <div className="fj-deco" aria-hidden="true">
        <span className="fj-grain" />
        <span className="fj-fibers" />
        <span className="fj-tape fj-tape-1" />
        <span className="fj-tape fj-tape-2" />
        <span className="fj-clip" />
        <span className="fj-coffee" />
        <span className="fj-colorbar">
          <i style={{ background: "#f3e8d4" }} />
          <i style={{ background: "#5d7d4a" }} />
          <i style={{ background: "#c2912b" }} />
          <i style={{ background: "#ab4a26" }} />
          <i style={{ background: "#2b5a55" }} />
          <i style={{ background: "#22302a" }} />
        </span>
      </div>
      <button
        type="button"
        className="fj-sound"
        data-muted={soundMuted ? "1" : "0"}
        onClick={() => setSoundMuted(journalSfx.toggle())}
        aria-label={soundMuted ? "Unmute sound" : "Mute sound"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9v6h3l5 4V5L7 9H4z" />
          {soundMuted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 8.5a5 5 0 010 7" />}
        </svg>
        <span>{soundMuted ? "SOUND OFF" : "SOUND ON"}</span>
      </button>

      <canvas id="star-canvas"></canvas>

      <img
        src={p1}
        className="floating-asteroid particle-p1"
        style={{ top: "15%", left: "10%" }}
        data-speed="0.08"
        alt=""
      />
      <img
        src={p2}
        className="floating-asteroid particle-p2"
        style={{ top: "25%", right: "12%" }}
        data-speed="0.05"
        alt=""
      />
      <img
        src={p3}
        className="floating-asteroid particle-p3"
        style={{ bottom: "18%", left: "8%" }}
        data-speed="0.09"
        alt=""
      />
      <img
        src={p4}
        className="floating-asteroid particle-p4"
        style={{ bottom: "20%", right: "10%" }}
        data-speed="0.06"
        alt=""
      />
      <img
        src={p5}
        className="floating-asteroid particle-p5"
        style={{ top: "10%", right: "35%" }}
        data-speed="0.04"
        alt=""
      />
      <img
        src={p6}
        className="floating-asteroid particle-p6"
        style={{ bottom: "12%", left: "30%" }}
        data-speed="0.07"
        alt=""
      />
      <div className="hero-content" id="hero-content" aria-hidden={story} inert={story} style={{ pointerEvents: story ? "none" : "auto" }}>
        <h1 className="hero-title">
          <span className="intro-line"><span>Explore the UAE.</span></span>
          <span className="intro-line"><span>Protect Our Future.</span></span>
        </h1>
        <p className="intro-journey-line">A journey across the Seven Emirates begins here.</p>
        <p
          style={{
            color: "#a7f3d0",
            marginBottom: "25px",
            fontSize: "1.2rem",
            fontWeight: 500,
          }}
        >
          Um Al Emarat School | Teacher: Riham Saleh
        </p>
        <div className="intro-ticket-motif" aria-hidden="true"><span>ECO TRAIN · AD → FUJ</span><i>7 stops · one shared future</i></div>
        <button className="cta-button" id="start-btn" aria-label="Board the Eco Train" onClick={startStory}>
          <span>Board the Eco Train</span>
          <div className="btn-arrow" aria-hidden="true">→</div>
        </button>
      </div>
      <div
        id="character-group"
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          zIndex: 5,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div className="radar-ring" id="radar-ring"></div>
        <div id="pod-container" className="pod-wrapper"></div>
        {modelUnavailable && <img src={mascot} alt="Bu Ghosn, your eco guide" style={{ width: 260, height: 300, objectFit: "contain" }} />}
      </div>
      <div id="story-container">
        <div className="story-slide-group" aria-hidden={!story || activeSlide !== 0} inert={!story || activeSlide !== 0}>
          <div
            className="story-title"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              marginBottom: "5px",
              color: "#ffffff",
              textShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
            }}
          >
            MEET BU GHOSN
          </div>
          <div
            className="story-title"
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              color: "#00ff88",
              marginBottom: "15px",
              fontWeight: 700,
              textShadow: "0 0 15px rgba(0, 255, 136, 0.5)",
            }}
          >
            بوغصن
          </div>
          <div className="story-desc" style={{ color: "#ffffff" }}>
            Your eco-guide and travel companion.
          </div>
        </div>

        <div className="story-slide-group" aria-hidden={!story || activeSlide !== 1} inert={!story || activeSlide !== 1}>
          <div
            className="story-title"
            style={{
              color: "#ffffff",
              textShadow: "0 0 25px rgba(255, 255, 255, 0.45)",
              fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)",
              marginBottom: "15px",
              lineHeight: 1.3,
            }}
          >
            HELP BU GHOSN SAVE HIS FRIENDS ACROSS THE UAE.
          </div>
          <div className="story-desc" style={{ color: "#ffffff" }}>
            Travel, explore, solve challenges, and collect 7 station stamps.
          </div>
        </div>
      <div id="journey-briefing" className="story-slide-group intro-map-slide" style={{ opacity: 0 }} aria-hidden={!story || activeSlide !== 2} inert={!story || activeSlide !== 2}>
        <JourneyBriefing onContinue={() => board.current()} />
      </div>
      </div>
      <nav className="progress-container intro-track-progress" id="progress-container" aria-label="Introduction progress" aria-hidden={!story}>
        <ol>{['Meet your guide', 'Mission briefing', 'Travel briefing'].map((label, index) => <li key={label} aria-current={story && activeSlide === index ? 'step' : undefined} data-complete={activeSlide > index}>
          <span aria-hidden="true" />{label}
        </li>)}</ol>
      </nav>
      {story && activeSlide < 2 && <button className="train-take-seat" onClick={() => { storyTimeline.current?.seek('travelBriefing', false); }}>Travel briefing →</button>}
    </section>
  );
}
