import type { TrainSnapshot } from './TrainJourneyEngine';

/** Procedural only. Shares the journal AudioContext; no sampled music or fetched audio. */
export class TrainAudio {
  private master: GainNode;
  private rumble: GainNode;
  private wind: GainNode;
  private brake: GainNode;
  private sources: AudioBufferSourceNode[] = [];
  private contacts = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer;
  private lastRail = 0;
  private lastState = '';
  private disposed = false;
  constructor(private context: AudioContext) {
    this.master = context.createGain(); this.master.gain.value = 0; this.master.connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 8, context.sampleRate);
    const data = this.noise.getChannelData(0);
    // Seeded noise is reproducible; a short seam taper prevents loop clicks.
    let seed = 1739;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1) * Math.min(1, i / 300, (data.length - i) / 300);
    }
    this.rumble = this.bed('lowpass', 180);
    this.wind = this.bed('bandpass', 640);
    this.brake = this.bed('bandpass', 1700);
  }
  private bed(type: BiquadFilterType, frequency: number) {
    const source = this.context.createBufferSource(); source.buffer = this.noise; source.loop = true;
    const filter = this.context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = 0.5;
    const gain = this.context.createGain(); gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master); source.start(); this.sources.push(source);
    return gain;
  }
  private tone(frequency: number, duration: number, level: number, delay = 0) {
    if (this.disposed) return;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    const now = this.context.currentTime + delay;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.025); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration + 0.02); this.contacts.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.contacts.delete(oscillator); };
  }
  departure() { this.tone(390, 0.65, 0.025); this.tone(520, 0.65, 0.012); }
  chime() { this.tone(660, 0.7, 0.035); this.tone(880, 0.8, 0.025, 0.14); }
  update(state: TrainSnapshot, muted: boolean, paused: boolean) {
    if (this.disposed) return;
    const t = this.context.currentTime;
    const velocity = Math.min(1, state.speed / 1.25);
    this.master.gain.setTargetAtTime(muted || paused ? 0 : 0.5, t, 0.08);
    this.rumble.gain.setTargetAtTime(0.008 + velocity * 0.12, t, 0.1);
    this.wind.gain.setTargetAtTime(velocity * velocity * 0.032, t, 0.12);
    this.brake.gain.setTargetAtTime(state.acceleration < -0.015 ? Math.min(0.018, -state.acceleration * 0.035) : 0, t, 0.12);
    const rail = Math.floor(state.currentDistance / 0.18);
    if (rail > this.lastRail && state.speed > 0.01 && !paused && !muted) {
      this.tone(72, 0.055, 0.012 + velocity * 0.018);
      this.tone(96, 0.04, 0.009 + velocity * 0.014, 0.055);
    }
    this.lastRail = rail;
    if (state.travelState === 'STATION_IDLE' && this.lastState !== 'STATION_IDLE') this.chime();
    this.lastState = state.travelState;
  }
  quiet() { this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025); }
  dispose() {
    this.disposed = true;
    for (const node of [...this.sources, ...Array.from(this.contacts)]) { try { node.stop(); } catch { /* ended */ } node.disconnect(); }
    this.sources = []; this.contacts.clear(); this.master.disconnect(); this.rumble.disconnect(); this.wind.disconnect(); this.brake.disconnect();
  }
}
