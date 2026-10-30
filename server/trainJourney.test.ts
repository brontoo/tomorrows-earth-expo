import { describe, expect, it } from 'vitest';
import { motionAt, TrainJourneyEngine } from '../client/src/components/game/train/TrainJourneyEngine';
import { journeyScenes, stations } from '../client/src/components/game/train/journeyScenes';
import { isComplete, readJourney, saveJourney } from '../client/src/components/game/train/persistence';

const run = (engine: TrainJourneyEngine, seconds: number, fps = 60) => {
  for (let i = 0; i < seconds * fps; i++) engine.tick(1 / fps);
};

describe('Living Train journey physics and progression', () => {
  it('keeps smoothstep distance continuous and arrives at rest without overshooting', () => {
    let previous = 0;
    for (let time = 0; time <= 30; time += 0.013) {
      const m = motionAt(time, 11, 1.25, 2.8, 4.5);
      expect(m.distance).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(m.distance).toBeLessThanOrEqual(11 + 1e-9);
      expect(m.speed).toBeGreaterThanOrEqual(0);
      previous = m.distance;
    }
    expect(motionAt(100, 11, 1.25, 2.8, 4.5)).toMatchObject({ distance: 11, speed: 0, acceleration: 0 });
  });
  it('uses the same physical clock at 30 and 120 fps', () => {
    const slow = new TrainJourneyEngine(0, true); const fast = new TrainJourneyEngine(0, true);
    run(slow, 9, 30); run(fast, 9, 120);
    expect(slow.state.currentDistance).toBeCloseTo(fast.state.currentDistance, 2);
    expect(slow.state.speed).toBeCloseTo(fast.state.speed, 2);
    expect(slow.state.scene).toBe(fast.state.scene);
  });
  it('visits every supplied scene, settles in Fujairah, then resets under full coverage', () => {
    const engine = new TrainJourneyEngine(0, true); const seen = new Set<number>();
    let finalHold = false; let switchedUnderCover = false; let previousScene = 0;
    for (let i = 0; i < 60 * 80; i++) {
      const s = engine.tick(1 / 60); seen.add(s.scene);
      if (s.travelState === 'ARRIVING' && s.station === 6) { finalHold = true; expect(s.speed).toBe(0); }
      if (s.travelState === 'RESETTING' && previousScene === 28 && s.scene === 1) { switchedUnderCover = true; expect(s.cover).toBe(1); }
      previousScene = s.scene;
    }
    expect(Array.from(seen).sort((a,b) => a-b)).toEqual(journeyScenes.map((_,i)=>i));
    expect(finalHold && switchedUnderCover).toBe(true);
    expect(engine.state).toMatchObject({ travelState: 'STATION_IDLE', station: 0, previewComplete: true, speed: 0 });
  });
  it('skips preview from acceleration and cruise without reversing scenery', () => {
    for (const elapsed of [2, 12]) {
      const engine = new TrainJourneyEngine(0, true); run(engine, elapsed); const distance = engine.state.currentDistance;
      engine.skipPreview(); run(engine, 4);
      expect(engine.state).toMatchObject({ station: 0, travelState: 'STATION_IDLE', previewComplete: true });
      expect(engine.state.currentDistance).toBeGreaterThanOrEqual(distance);
    }
  });
  it('departs through transition scenery and brakes before the next station', () => {
    const engine = new TrainJourneyEngine(); engine.depart(1);
    const seen = new Set<number>(); const phases = new Set<string>();
    for (let i = 0; i < 60 * 30; i++) { const s = engine.tick(1 / 60); seen.add(s.scene); phases.add(s.travelState); }
    expect(seen.has(4) && seen.has(5)).toBe(true);
    expect(phases.has('ACCELERATING') && phases.has('BRAKING')).toBe(true);
    expect(engine.state).toMatchObject({ station: 1, scene: stations[1].scene, speed: 0, travelState: 'STATION_IDLE' });
    expect(Math.abs(engine.state.coffee)).toBeLessThan(0.001);
  });
  it('reaches the final Fujairah station and does not depart beyond it', () => {
    const engine = new TrainJourneyEngine(5); engine.depart(6); run(engine, 40);
    expect(engine.state).toMatchObject({ station: 6, scene: 28, travelState: 'STATION_IDLE' });
    engine.depart(7); expect(engine.state.station).toBe(6);
  });
  it('reduced motion keeps coffee still and the full journey usable', () => {
    const engine = new TrainJourneyEngine(0, true, true); run(engine, 16);
    expect(engine.state).toMatchObject({ station: 0, travelState: 'STATION_IDLE', coffee: 0, previewComplete: true });
  });
  it('does not award stamps for evidence that is only submitted', () => {
    expect(isComplete('submitted')).toBe(false); expect(isComplete('verification_required')).toBe(false);
    expect(isComplete('completed')).toBe(true); expect(isComplete('verified')).toBe(true);
  });
  it('works when browser persistence is unavailable', () => {
    expect(readJourney('offline')).toEqual({ boarded: false, station: 0 });
    expect(() => saveJourney('offline', 3)).not.toThrow();
  });
  it('binds stable mission slugs and retains the complete original artwork order', () => {
    expect(journeyScenes).toHaveLength(29);
    expect(stations.map(s=>s.name)).toEqual(['Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah']);
    expect(stations[0].missionSlug).toBe('water-detective');
    expect(new Set(stations.map(s=>s.missionSlug)).size).toBe(7);
    expect(stations.every(s => journeyScenes[s.scene].station)).toBe(true);
  });
});
