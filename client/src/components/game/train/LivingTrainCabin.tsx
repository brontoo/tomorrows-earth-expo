import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuthContext } from '@/contexts/AuthContext';
import mascot from '@/assets/illustrations/tree.svg';
import { existingJourneyAudio, journalSfx, unlockJourneyAudio } from '@/lib/journalMotion';
import { CABIN_IMAGE, journeyScenes, stations } from './journeyScenes';
import { TrainJourneyEngine, type TrainSnapshot } from './TrainJourneyEngine';
import { SceneryRenderer, SceneCache } from './SceneryRenderer';
import { TrainAudio } from './TrainAudio';
import { isComplete, PREVIEW_KEY, readJourney, readStorage, saveJourney, writeStorage, type MissionCard, type MissionState } from './persistence';
import './train.css';

export default function LivingTrainCabin({ entryHeld = false, onReady }: { entryHeld?: boolean; onReady?: () => void } = {}) {
  const { user, isAuthenticated, loading } = useAuthContext();
  const student = isAuthenticated && user?.role === 'student';
  const missions = trpc.missions.getAll.useQuery(undefined, { staleTime: 60_000 });
  const passport = trpc.passport.getMine.useQuery(undefined, {
    enabled: student, refetchOnMount: 'always', refetchOnWindowFocus: true, refetchInterval: 15_000,
  });
  const profile = user?.id ? String(user.id) : 'guest';
  const refresh = () => { void missions.refetch(); if (student) void passport.refetch(); };
  if (loading || missions.isLoading || (student && passport.isLoading)) return <div className="train-loading" role="status">Preparing your Eco Train journey…</div>;
  return <TrainCabin key={profile} profile={profile} missions={(missions.data ?? []) as MissionCard[]}
    states={(passport.data?.missionStates ?? []) as MissionState[]} student={student}
    error={missions.isError || (student && passport.isError)} refresh={refresh} entryHeld={entryHeld} onReady={onReady} />;
}

function TrainCabin({ profile, missions, states, student, error, refresh, entryHeld, onReady }: {
  profile: string; missions: MissionCard[]; states: MissionState[]; student: boolean; error: boolean; refresh: () => void; entryHeld: boolean; onReady?: () => void;
}) {
  const boundMissions = stations.map(station => missions.find(m => m.slug === station.missionSlug));
  const completed = boundMissions.map(m => Boolean(m && isComplete(states.find(s => s.missionId === m.id)?.status)));
  const firstIncomplete = completed.findIndex(done => !done);
  const frontier = firstIncomplete < 0 ? stations.length - 1 : firstIncomplete;
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [engine] = useState(() => new TrainJourneyEngine(Math.min(readJourney(profile).station, frontier), readStorage(PREVIEW_KEY) !== 'true', reduced));
  const [view, setView] = useState<TrainSnapshot>({ ...engine.state });
  const [muted, setMuted] = useState(journalSfx.muted);
  const [audioEnabled, setAudioEnabled] = useState(Boolean(existingJourneyAudio()));
  const [paused, setPaused] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retry, setRetry] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const coffee = useRef<SVGEllipseElement>(null);
  const debug = useRef<HTMLOutputElement>(null);
  const audio = useRef<TrainAudio | null>(null);
  const readyCallback = useRef(onReady); readyCallback.current = onReady;
  const controls = useRef({ muted, paused, reduced, entryHeld }); controls.current = { muted, paused, reduced, entryHeld };
  const current = stations[view.station];
  const mission = boundMissions[view.station];
  const missionStatus = states.find(s => s.missionId === mission?.id)?.status;
  const travelling = view.travelState !== 'STATION_IDLE';
  const preview = view.mode === 'preview';
  const next = stations[view.station + 1];
  const canDepart = !travelling && completed[view.station] && next && view.station + 1 <= frontier && !error;

  useEffect(() => {
    const sync = () => { setMuted(journalSfx.muted); setAudioEnabled(Boolean(existingJourneyAudio())); };
    window.addEventListener('eco-sound-preference', sync);
    return () => window.removeEventListener('eco-sound-preference', sync);
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(media.matches); engine.setReducedMotion(media.matches); };
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, [engine]);

  useEffect(() => {
    if (!canvas.current || !artwork.current) return;
    const cache = new SceneCache(); const renderer = new SceneryRenderer(canvas.current, cache);
    let artScale = 1;
    const resize = new ResizeObserver(() => {
      renderer.resize();
      artScale = Math.max(0.4, Math.min(1.2, (artwork.current?.clientWidth ?? 1440) / 1440));
      renderer.draw(engine.state, controls.current.reduced);
    });
    resize.observe(canvas.current); renderer.resize();
    let frame = 0; let previous = 0; let active = true; let lastKey = ''; let renderedScene = -1; let renderedState = ''; let wasLoading = true; let wasError = false;
    let frameReady = false; let announcedReady = false;
    const images = [CABIN_IMAGE, '/train/window-mask.png', '/train/cabin-mask.png'].map(src => {
      const image = new Image(); image.src = src; return image.decode();
    });
    void Promise.all(images).then(() => { if (active) frameReady = true; }).catch(() => { if (active) setImageError(true); });
    if (existingJourneyAudio()) audio.current = new TrainAudio(existingJourneyAudio()!);
    const animate = (now: number) => {
      if (!active) return;
      const ready = frameReady && renderer.ready && cache.prepare(engine.state.scene, engine.state.destinationScene);
      const failed = cache.failed.size > 0;
      if (wasError !== failed) { wasError = failed; setImageError(failed); }
      const waiting = !ready;
      if (waiting !== wasLoading) { wasLoading = waiting; setLoading(waiting); }
      const stop = document.hidden || controls.current.paused || controls.current.entryHeld || waiting;
      const dt = previous && !stop ? Math.min(0.1, (now - previous) / 1000) : 0; previous = now;
      if (dt) engine.tick(dt);
      const paint = engine.state.travelState !== 'STATION_IDLE' || Math.abs(engine.state.coffee) > 0.0001 || Math.abs(engine.state.cabinX) + Math.abs(engine.state.cabinY) > 0.001
        || renderedScene !== engine.state.scene || renderedState !== engine.state.travelState;
      if (ready && paint && cache.prepare(engine.state.scene, engine.state.destinationScene)) {
        renderer.draw(engine.state, controls.current.reduced);
        renderedScene = engine.state.scene; renderedState = engine.state.travelState;
        if (!announcedReady) { announcedReady = true; readyCallback.current?.(); }
      }
      const s = engine.state;
      // Both masks, scenery and foreground share a single artboard transform.
      if (artwork.current) artwork.current.style.transform = controls.current.reduced ? 'none'
        : `translate3d(${s.cabinX * artScale}px, ${s.cabinY * artScale}px, 0)`;
      if (coffee.current) coffee.current.setAttribute('transform', `rotate(${controls.current.reduced ? 0 : s.coffee * 18} 1656 1332)`);
      audio.current?.update(s, controls.current.muted, stop);
      const key = `${s.travelState}:${s.mode}:${s.scene}:${s.station}:${s.previewComplete}`;
      if (lastKey !== key) {
        lastKey = key; setView({ ...s });
        if (s.travelState === 'STATION_IDLE') saveJourney(profile, s.station);
        if (s.previewComplete) writeStorage(PREVIEW_KEY, 'true');
      }
      if (debug.current) debug.current.value = `${s.travelState} · ${s.mode} · scene ${s.scene + 1} · ${s.speed.toFixed(2)} windows/s · a ${s.acceleration.toFixed(2)} · d ${s.currentDistance.toFixed(2)} · p ${s.sceneProgress.toFixed(2)} · body ${s.cabinX.toFixed(2)},${s.cabinY.toFixed(2)}`;
      frame = requestAnimationFrame(animate);
    };
    const visibility = () => {
      previous = 0;
      if (document.hidden) { audio.current?.quiet(); cancelAnimationFrame(frame); }
      else frame = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(animate);
    // Remaining files are fetched, not decoded, one at a time during idle periods.
    const abort = new AbortController(); let idle = 0; let prefetchIndex = 0;
    const prefetch = () => {
      if (!active || prefetchIndex >= journeyScenes.length) return;
      const src = journeyScenes[prefetchIndex++].image;
      void fetch(src, { signal: abort.signal, cache: 'force-cache' }).catch(() => undefined).finally(() => {
        if (active && 'requestIdleCallback' in window) idle = window.requestIdleCallback(prefetch, { timeout: 3000 });
      });
    };
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(prefetch, { timeout: 3000 });
    return () => {
      active = false; cancelAnimationFrame(frame); resize.disconnect(); cache.dispose(); abort.abort();
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      document.removeEventListener('visibilitychange', visibility);
      audio.current?.dispose(); audio.current = null;
    };
  }, [engine, profile, retry]);

  useEffect(() => {
    if (!travelling) setCardOpen(true);
    if (!travelling) document.getElementById(`station-${current.id}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current.id, travelling]);

  const activateAudio = () => {
    const context = unlockJourneyAudio();
    if (context && !audio.current) audio.current = new TrainAudio(context);
    setAudioEnabled(Boolean(context));
    return context;
  };
  const toggleSound = () => {
    const context = activateAudio();
    const value = audioEnabled ? !muted : false;
    journalSfx.setMuted(value); setMuted(value); setAudioEnabled(Boolean(context));
  };
  const depart = (index: number) => {
    if (travelling || index === engine.state.station || index > frontier || error) return;
    activateAudio(); audio.current?.departure(); engine.depart(index);
  };
  const stationTitle = view.station === 0 ? 'First Stop: Abu Dhabi' : view.station === 6 ? 'Final Stop: Fujairah' : `Welcome to ${current.name}`;
  const travelLabel = view.travelState === 'BOARDING' ? 'Join us on a journey across the Seven Emirates'
    : view.travelState === 'RESETTING' ? 'Your journey begins here'
    : view.travelState === 'ARRIVING' || view.travelState === 'BRAKING' ? `Arriving in ${stations[view.destinationStation].name}`
    : preview ? 'A glimpse of the Seven Emirates' : `Next Stop: ${stations[view.destinationStation].name}`;

  return <section className="train-shell" aria-label="The Living Train Cabin" dir="ltr">
    <div className="train-view">
    <header className="train-header">
      <Link href="/" className="train-brand"><span className="train-brand-mark" aria-hidden="true">↟</span><span>THE LIVING TRAIN CABIN<small>Eco Train Journey Across the Seven Emirates</small></span></Link>
      <div className="train-controls">
        {travelling && <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume journey' : 'Pause journey'}>{paused ? 'Resume' : 'Pause'}</button>}
        <button onClick={toggleSound} aria-pressed={!muted && audioEnabled} aria-label={!audioEnabled ? 'Enable train sound' : muted ? 'Unmute sound' : 'Mute sound'}>{!audioEnabled ? 'Enable sound' : muted ? 'Sound off' : 'Sound on'}</button>
      </div>
    </header>
      <div className="train-artboard" ref={artwork} data-testid="train-artboard" aria-label={`Train window: ${journeyScenes[view.scene].label}`}>
        <canvas ref={canvas} className="train-scenery" aria-hidden="true" />
        <img className="train-foreground" src={CABIN_IMAGE} alt="Illustrated train cabin with purple curtains, warm lamps and coffee on the table" draggable={false} />
        <svg className="train-coffee" viewBox="1576 1307 160 50" aria-hidden="true"><ellipse ref={coffee} cx="1656" cy="1332" rx="47" ry="6" fill="#d7b791" opacity=".14" /></svg>
        <div className="train-window-caption">
          <span className="train-eyebrow">{preview ? 'JOURNEY PREVIEW' : travelling ? 'ON THE RAILS' : 'CURRENT STOP'}</span>
          <h1 tabIndex={-1}>{travelling ? travelLabel : stationTitle}</h1>
          {travelling && (!preview || ['landmark', 'outro'].includes(journeyScenes[view.scene].type)) && <p key={`${journeyScenes[view.scene].emirate}:${view.scene}`} className="train-emirate-flash">{stations[journeyScenes[view.scene].emirate].name.toUpperCase()}</p>}
        </div>
        {preview && <button className="train-skip" onClick={() => { engine.skipPreview(); writeStorage(PREVIEW_KEY, 'true'); }} aria-label="Skip journey preview">Skip Preview <span aria-hidden="true">→</span></button>}
      </div>
      {(loading || imageError) && <div className="train-load-status" role="status">{imageError ? <><span>Scenery could not be loaded.</span><button onClick={() => { setImageError(false); setLoading(true); setRetry(value => value + 1); }}>Retry scenery</button></> : 'Preparing the next view…'}</div>}
      {paused && <p className="train-pause-status" role="status">Journey paused</p>}
      {!travelling && (cardOpen ? <>
      <div id="train-challenge" className="train-station-panel" aria-live="polite" aria-atomic="true">
        <button className="train-card-close" onClick={() => setCardOpen(false)} aria-label="Hide station challenge">×</button>
        <img src={mascot} alt="Bu Ghosn, your eco guide" />
        <div className="train-guide-copy"><span className="train-eyebrow">بوغصن · YOUR ECO GUIDE</span>
          {travelling ? <><h3>{paused ? 'Take a breath. We can wait.' : travelLabel}</h3><p>{preview ? 'Seven Emirates. One shared environment. Your adventure is about to begin.' : 'Enjoy the view. Your next challenge will appear when the train stops.'}</p></>
          : error ? <><h3>Your journey is safe.</h3><p>We could not refresh the mission catalogue or passport. Reconnect before continuing.</p></>
          : completed[view.station] ? <><h3>{current.name} Stamp Earned</h3><p>{next ? `Challenge complete. Ready to depart for ${next.name}?` : 'All seven stops explored. Your passport keeps every verified reward.'}</p></>
          : <><h3>We've arrived in {current.name}.</h3><p>{mission ? `${mission.title} — ${mission.description ?? 'Your environmental challenge is ready.'}` : 'Your teacher has not published this station’s mission yet. You can still enjoy the journey preview.'}</p>{['submitted', 'verification_required'].includes(missionStatus ?? '') && <p>Your evidence is awaiting teacher verification. Your next stop unlocks after approval.</p>}</>}
        </div>
        <div className="train-actions">
          {error ? <button className="train-primary" onClick={refresh}>Reconnect journey</button>
            : !travelling && canDepart ? <button className="train-primary" onClick={() => depart(view.station + 1)}>Next Stop: {next.name} <span aria-hidden="true">→</span></button>
            : !travelling && mission ? <Link className="train-primary" href={`/missions/${mission.slug}`} onClick={() => saveJourney(profile, view.station)}>{completed[view.station] ? 'Revisit Challenge' : missionStatus ? 'Continue Mission' : 'Start Challenge'} <span aria-hidden="true">→</span></Link>
            : null}
          {!travelling && completed.every(Boolean) && <Link href="/my-journey">Open my passport</Link>}
          {!student && !travelling && <Link href="/login?redirectTo=%2Feco-journey">Sign in to save mission progress</Link>}
        </div>
      </div>
      </> : <button className="train-challenge-toggle" onClick={() => setCardOpen(true)} aria-expanded={false} aria-controls="train-challenge">Show station challenge →</button>)}
    </div>
    <div className="train-ticket">
      <div className="train-ticket-heading"><div><span className="train-eyebrow">YOUR TRAVEL TICKET · 7 EMIRATES</span><h2>The Seven Emirates Journey</h2></div><div className="train-ticket-tools"><button className="train-replay" disabled={travelling} onClick={() => { activateAudio(); engine.board(); }}>Replay Journey Preview</button><span className="train-progress">{completed.filter(Boolean).length} / 7 stamps</span></div></div>
      <nav className="train-route" aria-label="Emirate stations">
        {stations.map((station, i) => {
          const status = completed[i] ? 'Completed' : i === view.station ? 'Current Stop' : i <= frontier ? 'Available' : 'Locked';
          return <button id={`station-${station.id}`} key={station.id} className={`train-stop ${completed[i] ? 'is-complete' : ''} ${i === view.station ? 'is-current' : ''}`}
            disabled={travelling || i > frontier || error} aria-current={i === view.station ? 'step' : undefined}
            aria-label={`${i + 1}. ${station.name}: ${status}`} onClick={() => depart(i)}>
            <span className="train-stamp"><img src={station.map} alt="" />{completed[i] && <b aria-hidden="true">✓</b>}</span>
            <span>{station.name}<small>{status}</small></span>
          </button>;
        })}
      </nav>

    </div>
    {import.meta.env.DEV && new URLSearchParams(location.search).has('trainDebug') && <details className="train-debug"><summary>Journey diagnostics</summary><output ref={debug} /><button onClick={() => engine.skipPreview()}>End preview</button><span>Station travel uses the real passport unlock rules.</span></details>}
    <span className="train-sr-only" role="status">{travelling ? travelLabel : stationTitle}</span>
  </section>;
}
