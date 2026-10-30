import { journeyScenes, stations } from './journeyScenes';
import { makePreviewProfile, previewMotionAt } from './previewMotion';
import { railContactsBetween } from './railMotion';

export type TravelState = 'BOARDING' | 'ACCELERATING' | 'CRUISING' | 'BRAKING' | 'ARRIVING' | 'RESETTING' | 'STATION_IDLE';
export type JourneyMode = 'preview' | 'interactive';
export interface TrainSnapshot {
  travelState: TravelState;
  mode: JourneyMode;
  currentDistance: number;
  speed: number;
  targetSpeed: number;
  acceleration: number;
  scene: number;
  destinationScene: number;
  sceneProgress: number;
  station: number;
  destinationStation: number;
  cover: number;
  coffee: number;
  clock: number;
  previewComplete: boolean;
  cabinX: number;
  cabinY: number;
  railImpulse: number;
  railContactCount: number;
}
export const smoothstep = (u: number) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const integral = (u: number) => u ** 3 - u ** 4 / 2;

/** Analytic integral of smoothstep velocity: independent of rendering frame rate. */
export function motionAt(time: number, distance: number, peak: number, ramp: number, brake: number) {
  peak = Math.min(peak, distance / ((ramp + brake) / 2));
  const cruise = Math.max(0, distance / peak - (ramp + brake) / 2);
  const duration = ramp + cruise + brake;
  if (time >= duration) return { distance, speed: 0, acceleration: 0, duration, phase: 'BRAKING' as const };
  const t = Math.max(0, Math.min(time, duration));
  if (t < ramp) {
    const u = t / ramp;
    return { distance: peak * ramp * integral(u), speed: peak * smoothstep(u), acceleration: peak * 6 * u * (1 - u) / ramp, duration, phase: 'ACCELERATING' as const };
  }
  if (t < ramp + cruise) return { distance: peak * ramp / 2 + peak * (t - ramp), speed: peak, acceleration: 0, duration, phase: 'CRUISING' as const };
  const u = (t - ramp - cruise) / brake;
  return { distance: peak * ramp / 2 + peak * cruise + peak * brake * (u - integral(u)), speed: peak * (1 - smoothstep(u)), acceleration: -peak * 6 * u * (1 - u) / brake, duration, phase: 'BRAKING' as const };
}

/** Mutable simulation. One clock drives scenery, suspension, coffee and audio. No DOM or timers. */
export class TrainJourneyEngine {
  readonly state: TrainSnapshot;
  private path: number[] = [];
  private lengths: number[] = [];
  private total = 0;
  private elapsed = 0;
  private phaseTime = 0;
  private tripStart = 0;
  private coffeeVelocity = 0;
  private resetStation = 0;
  private reduced = false;
  private speedBeforeReset = 0;
  private previewProfile = makePreviewProfile(journeyScenes.map((_, i) => i));
  private impulseVelocity = 0;
  private suspension = 0;
  private suspensionVelocity = 0;
  private motionEnvelope = 0;
  private readablePreview = false;

  constructor(station = 0, preview = false, reduced = false) {
    station = Math.max(0, Math.min(6, station));
    this.state = { travelState: 'STATION_IDLE', mode: 'interactive', currentDistance: 0, speed: 0, targetSpeed: 0, acceleration: 0,
      scene: stations[station].scene, destinationScene: stations[station].scene, sceneProgress: 0, station, destinationStation: station,
      cover: 0, coffee: 0, clock: 0, previewComplete: false, cabinX: 0, cabinY: 0, railImpulse: 0, railContactCount: 0 };
    this.reduced = reduced;
    if (preview) this.board();
  }
  setReducedMotion(value: boolean) { this.reduced = value; }
  private begin(path: number[], destination: number, mode: JourneyMode) {
    this.path = path;
    this.previewProfile = makePreviewProfile(path);
    this.readablePreview = mode === 'preview' && !this.reduced;
    this.lengths = path.slice(0, -1).map(i => this.readablePreview ? 0.85 : journeyScenes[i].baseDuration / journeyScenes[i].speedMultiplier);
    this.total = this.lengths.reduce((a, b) => a + b, 0);
    this.elapsed = 0;
    this.phaseTime = 0;
    this.tripStart = this.state.currentDistance;
    Object.assign(this.state, { mode, destinationStation: destination, travelState: 'ACCELERATING', scene: path[0], destinationScene: path[1] ?? path[0], sceneProgress: 0, previewComplete: false });
  }
  board() {
    this.resetStation = this.state.station;
    this.begin(journeyScenes.map((_, i) => i), 6, 'preview');
    this.state.travelState = 'BOARDING';
  }
  depart(destination: number) {
    if (this.state.travelState !== 'STATION_IDLE' || destination === this.state.station || !stations[destination]) return;
    const from = stations[this.state.station].scene;
    const to = stations[destination].scene;
    // Revisiting an earned stamp uses a covered station transfer, never reverse scrolling.
    if (to < from) { this.resetStation = destination; this.reset(); return; }
    this.begin(Array.from({ length: to - from + 1 }, (_, i) => from + i), destination, 'interactive');
  }
  skipPreview() { if (this.state.mode === 'preview') this.reset(); }
  private reset() {
    this.speedBeforeReset = this.state.speed;
    this.state.travelState = 'RESETTING';
    this.phaseTime = 0;
  }
  private stopAt(station: number) {
    Object.assign(this.state, { scene: stations[station].scene, destinationScene: stations[station].scene, sceneProgress: 0, station, destinationStation: station, speed: 0, targetSpeed: 0, acceleration: 0 });
  }
  tick(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return this.state;
    // Fixed substeps keep the acceleration-driven damped spring stable on slow devices.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0.000001) { const step = Math.min(remaining, 1 / 120); this.advance(step); remaining -= step; }
    return this.state;
  }
  private advance(dt: number) {
    const s = this.state;
    const previousDistance = s.currentDistance;
    s.clock += dt;
    this.phaseTime += dt;
    if (s.travelState === 'BOARDING') {
      if (this.phaseTime >= (this.reduced ? 0.2 : 1.5)) { s.travelState = 'ACCELERATING'; this.phaseTime = 0; }
    } else if (s.travelState === 'RESETTING') {
      const duration = this.reduced ? 0.5 : 2.2;
      const u = this.phaseTime / duration;
      s.cover = smoothstep(u < 0.5 ? u * 2.7 : (1 - u) * 2.7);
      s.speed = this.speedBeforeReset * (1 - smoothstep(Math.min(1, u * 2)));
      s.acceleration = 0;
      if (u >= 0.5) this.stopAt(this.resetStation);
      if (u >= 1) {
        s.cover = 0; s.travelState = 'STATION_IDLE';
        if (s.mode === 'preview') s.previewComplete = true;
        s.mode = 'interactive';
      }
    } else if (s.travelState === 'ARRIVING') {
      if (this.phaseTime >= (this.reduced ? 0.2 : s.mode === 'preview' ? 2.8 : 1.4)) {
        if (s.mode === 'preview') this.reset();
        else s.travelState = 'STATION_IDLE';
      }
    } else if (s.travelState !== 'STATION_IDLE') {
      const preview = s.mode === 'preview';
      const peak = this.reduced ? (preview ? 5 : 2) : (preview ? 1.25 : 0.48);
      const ramp = this.reduced ? 0.25 : preview ? 2.8 : 2.2;
      const brake = this.reduced ? 0.3 : preview ? 4.5 : 2.8;
      this.elapsed += dt;
      const motion = this.readablePreview ? previewMotionAt(this.elapsed, this.previewProfile) : motionAt(this.elapsed, this.total, peak, ramp, brake);
      s.speed = motion.speed; s.targetSpeed = this.readablePreview ? motion.speed : motion.phase === 'BRAKING' ? 0 : peak;
      s.acceleration = motion.acceleration; s.currentDistance = this.tripStart + motion.distance;
      s.travelState = this.readablePreview && this.elapsed > 1 && motion.duration - this.elapsed > 0.7 ? 'CRUISING' : motion.phase;
      let local = motion.distance; let segment = 0;
      while (segment < this.lengths.length - 1 && local >= this.lengths[segment]) { local -= this.lengths[segment]; segment++; }
      s.scene = this.path[segment];
      s.destinationScene = this.path[segment + 1] ?? s.scene;
      s.sceneProgress = Math.min(1, local / (this.lengths[segment] || 1));
      if (this.elapsed >= motion.duration) {
        this.stopAt(s.destinationStation); s.travelState = 'ARRIVING'; this.phaseTime = 0;
      }
    }
    // The same distance crossings drive rail sound and physical axle impulses.
    const contacts = railContactsBetween(previousDistance, s.currentDistance);
    for (const contact of contacts) {
      s.railContactCount++;
      if (!this.reduced) this.impulseVelocity += 34 * contact.weight;
    }
    if (this.reduced) {
      s.coffee = 0; s.cabinX = 0; s.cabinY = 0; s.railImpulse = 0;
      this.coffeeVelocity = 0; this.impulseVelocity = 0; this.suspension = 0;
      this.suspensionVelocity = 0; this.motionEnvelope = 0;
      return;
    }
    const velocity = Math.min(1, s.speed / 0.65);
    this.motionEnvelope += (velocity - this.motionEnvelope) * (1 - Math.exp(-dt * 3));
    this.impulseVelocity += (-650 * s.railImpulse - 26 * this.impulseVelocity) * dt;
    s.railImpulse += this.impulseVelocity * dt;
    this.suspensionVelocity += (-s.acceleration * 8 - 18 * this.suspension - 7 * this.suspensionVelocity) * dt;
    this.suspension += this.suspensionVelocity * dt;
    s.cabinX = Math.max(-3, Math.min(3, this.suspension + this.motionEnvelope * (1.2 * Math.sin(s.clock * 1.17) + 0.26 * Math.sin(s.clock * 0.47))));
    s.cabinY = Math.max(-3, Math.min(3, s.railImpulse + this.motionEnvelope * (0.65 * Math.sin(s.clock * 1.73) + 0.32 * Math.sin(s.currentDistance * 91) + 0.14 * Math.sin(s.currentDistance * 147))));
    const forcing = -s.acceleration * 1.2 + s.railImpulse * 0.03;
    this.coffeeVelocity += (forcing - 32 * s.coffee - 8 * this.coffeeVelocity) * dt;
    s.coffee = Math.max(-0.12, Math.min(0.12, s.coffee + this.coffeeVelocity * dt));
  }
}
