import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { existingJourneyAudio, journalSfx, prefersReducedMotion, unlockJourneyAudio } from '@/lib/journalMotion';
import { boardingArtwork, preloadBoardingAssets } from './boardingAssets';
import { PlatformAmbience } from './PlatformAmbience';

export default function BoardingPlatform({ cabinReady, onPrepareCabin, onReveal, onEntered }: {
  cabinReady: boolean; onPrepareCabin: () => void; onReveal: () => void; onEntered: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const boardButton = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const ambience = useRef<PlatformAmbience | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'boarding' | 'covered' | 'revealing'>('waiting');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(journalSfx.muted);
  const [attention, setAttention] = useState(false);
  const callbacks = useRef({ onPrepareCabin, onReveal, onEntered }); callbacks.current = { onPrepareCabin, onReveal, onEntered };

  useEffect(() => {
    let active = true;
    void preloadBoardingAssets().then(() => { if (active) setReady(true); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    if (ready && phase === 'waiting') boardButton.current?.focus({ preventScroll: true });
  }, [ready, phase]);
  useEffect(() => {
    const context = existingJourneyAudio(); if (context) ambience.current = new PlatformAmbience(context);
    const sync = () => { setMuted(journalSfx.muted); ambience.current?.setMuted(journalSfx.muted || document.hidden); };
    sync(); window.addEventListener('eco-sound-preference', sync); document.addEventListener('visibilitychange', sync);
    return () => {
      timeline.current?.kill(); ambience.current?.dispose(); ambience.current = null;
      window.removeEventListener('eco-sound-preference', sync); document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  useEffect(() => {
    if (phase !== 'covered' || !cabinReady || !cover.current) return;
    setPhase('revealing'); callbacks.current.onReveal(); ambience.current?.fadeIntoCabin();
    timeline.current = gsap.timeline({ onComplete: () => callbacks.current.onEntered() })
      .to(cover.current, { clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)', duration: prefersReducedMotion() ? .25 : .8, ease: 'power2.inOut' });
  }, [phase, cabinReady]);
  const enableAudio = () => {
    const context = unlockJourneyAudio();
    if (context && !ambience.current) ambience.current = new PlatformAmbience(context);
    return context;
  };
  const toggleSound = () => {
    enableAudio(); journalSfx.setMuted(!journalSfx.muted); setMuted(journalSfx.muted);
    ambience.current?.setMuted(journalSfx.muted);
  };
  const board = () => {
    if (started.current || phase !== 'waiting' || !ready || !art.current || !cover.current) return;
    started.current = true;
    enableAudio(); ambience.current?.confirm(); ambience.current?.setMuted(journalSfx.muted);
    setPhase('boarding'); setAttention(false);
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline(); timeline.current = tl;
    tl.to(art.current, { scale: reduced ? 1 : 1.12, transformOrigin: `${boardingArtwork.doorway.x * 100}% ${boardingArtwork.doorway.y * 100}%`, duration: reduced ? .1 : 1.1, ease: 'power2.in' });
    tl.call(() => {
      const bounds = art.current!.getBoundingClientRect();
      const point = (x: number, y: number) => `${(bounds.x + bounds.width * x) / innerWidth * 100}% ${(bounds.y + bounds.height * y) / innerHeight * 100}%`;
      gsap.set(cover.current, { opacity: 1, clipPath: reduced ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
        : `polygon(${point(.63, .235)}, ${point(.757, .17)}, ${point(.757, .97)}, ${point(.63, .795)})` });
    });
    tl.to(cover.current, { clipPath: 'polygon(-5% -5%, 105% -5%, 105% 105%, -5% 105%)', duration: reduced ? .2 : .7, ease: 'power2.inOut' });
    tl.call(() => { setPhase('covered'); callbacks.current.onPrepareCabin(); });
  };

  return <section ref={root} className={`boarding-platform is-${phase} ${attention ? 'is-inviting' : ''}`} aria-label="Eco Train boarding platform">
    <div ref={art} className="boarding-platform-art" aria-hidden={phase === 'revealing'}>
      {ready && <img src={boardingArtwork.src} alt="Bu Ghosn welcomes you beside the open door of the Eco Train at a UAE station platform" draggable={false} />}
      <div className="boarding-door-glow" aria-hidden="true" />
    </div>
    <div className="boarding-platform-header">
      <span>THE SEVEN EMIRATES JOURNEY</span>
      <button type="button" onClick={toggleSound} aria-label={muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={!muted}>{muted ? 'Sound off' : 'Sound on'}</button>
    </div>
    <div className="boarding-invitation" aria-hidden={phase !== 'waiting'} inert={phase !== 'waiting'}>
      <span className="intro-annotation">YOUR TRAIN IS WAITING</span>
      <h1>All aboard.</h1>
      <p>Your journey across the Seven Emirates begins now.</p>
      {failed ? <><p role="status">The platform view could not be loaded.</p><button className="boarding-cta" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Try again</button></>
        : <button ref={boardButton} type="button" className="boarding-cta" disabled={!ready} onClick={board} onMouseEnter={() => setAttention(true)} onMouseLeave={() => setAttention(false)} onFocus={() => setAttention(true)} onBlur={() => setAttention(false)} aria-label="Board the Eco Train">{ready ? 'BOARD NOW' : 'Preparing your platform…'} <span aria-hidden="true">→</span></button>}
    </div>
    <div ref={cover} className="boarding-door-cover" aria-hidden="true" />
    {phase !== 'waiting' && <p className="boarding-status" role="status">Taking your seat…</p>}
  </section>;
}
