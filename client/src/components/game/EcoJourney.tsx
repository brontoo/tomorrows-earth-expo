import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAuthContext } from "@/contexts/AuthContext";
import { initFloatingParallax, initConstellationCanvas } from "./animations";
import { init3DPod } from "./threeScene";
import { journalSfx, prefersReducedMotion, unlockJourneyAudio } from "@/lib/journalMotion";
import mascot from "@/assets/illustrations/tree.svg";
import LivingTrainCabin from "./train/LivingTrainCabin";
import { CABIN_IMAGE, journeyScenes } from "./train/journeyScenes";
import { readJourney, saveJourney } from "./train/persistence";
import "./EcoJourney.css";
import "./fieldJournal.css";
import p1 from "../../assets/illustrations/p1.png";
import p2 from "../../assets/illustrations/p2.png";
import p3 from "../../assets/illustrations/p3.png";
import p4 from "../../assets/illustrations/p4.png";
import p5 from "../../assets/illustrations/p5.png";
import p6 from "../../assets/illustrations/p6.png";

export default function EcoJourney() {
  const { user } = useAuthContext();
  const profile = user?.id ? String(user.id) : "guest";
  const [cabin, setCabin] = useState(() => readJourney(profile).boarded);
  useEffect(() => { setCabin(readJourney(profile).boarded); }, [profile]);
  if (cabin) return <LivingTrainCabin />;
  return <JourneyOpening onBoard={() => { saveJourney(profile, readJourney(profile).station); setCabin(true); }} />;
}

function JourneyOpening({ onBoard }: { onBoard: () => void }) {
  const containerRef = useRef<HTMLElement>(null);
  const [soundMuted, setSoundMuted] = useState(journalSfx.muted);
  const [story, setStory] = useState(false);
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

  useEffect(() => {
    if (!story) return;
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      const timeline = gsap.timeline();
      timeline.to("#hero-content", { opacity: 0, y: reduced ? 0 : -20, duration: reduced ? .1 : .4 });
      timeline.to("#character-group", { y: "-10vh", scale: 1.1, duration: reduced ? .1 : .7 }, 0);
      timeline.set("#story-container", { pointerEvents: "none" });
      timeline.to("#progress-container", { opacity: 1, duration: .2 });
      const groups = containerRef.current?.querySelectorAll(".story-slide-group") ?? [];
      groups.forEach((group, index) => {
        timeline.set(group, { opacity: 1 });
        timeline.fromTo(group.querySelectorAll(".story-title, .story-desc"), { opacity: 0, y: reduced ? 0 : 12 }, { opacity: 1, y: 0, duration: reduced ? .1 : .45, stagger: .15 });
        timeline.to(`.progress-bar:nth-child(${index + 1}) .progress-fill`, { width: "100%", duration: 3.4, ease: "none" });
        timeline.to(group, { opacity: 0, duration: .3 });
      });
      timeline.call(() => board.current());
    }, containerRef);
    return () => context.revert();
  }, [story]);

  const startStory = () => {
    if (story) return;
    unlockJourneyAudio(); journalSfx.stamp();
    setStory(true);
    // Warm only the frame and first two scenery images while the short story plays.
    for (const src of [CABIN_IMAGE, '/train/window-mask.png', '/train/cabin-mask.png', ...journeyScenes.slice(0, 2).map(scene => scene.image)]) {
      const image = new Image(); image.src = src;
    }
  };
  return (
    <section ref={containerRef} className="hero-section">
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
      <div className="hero-content" id="hero-content" style={{ pointerEvents: story ? "none" : "auto" }}>
        <h1 className="hero-title">
          Explore the UAE.
          <br />
          Protect Our Future.
        </h1>
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
        <button className="cta-button" id="start-btn" onClick={startStory}>
          <span>Board the Eco Train</span>
          <div className="btn-arrow">→</div>
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
        <div className="story-slide-group">
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
            Your official eco-guide for this adventure.
          </div>
        </div>

        <div className="story-slide-group">
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
            Board the Eco Train and travel across the Seven Emirates to help protect our environment.
          </div>
        </div>
      </div>
      <div className="progress-container" id="progress-container">
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>

      {story && <button className="train-take-seat" onClick={() => board.current()}>Take my seat →</button>}
    </section>
  );
}
