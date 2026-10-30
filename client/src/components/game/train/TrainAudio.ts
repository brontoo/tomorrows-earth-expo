import type { TrainSnapshot } from './TrainJourneyEngine';
import { railContactsBetween } from './railMotion';

/** Procedural carriage sound; one shared context, one continuous mix across scenes. */
export class TrainAudio {
  private master: GainNode;
  private limiter: DynamicsCompressorNode;
  private rumble: GainNode;
  private wheels: GainNode;
  private wind: GainNode;
  private brake: GainNode;
  private pressure: GainNode;
  private sources: AudioBufferSourceNode[] = [];
  private contacts = new Set<AudioScheduledSourceNode>();
  private nodes: AudioNode[] = [];
  private whiteNoise: AudioBuffer;
  private brownNoise: AudioBuffer;
  private railBuffer: AudioBuffer;
  private lastDistance: number | null = null;
  private lastState = '';
  private disposed = false;
  constructor(private context: BaseAudioContext) {
    this.master = context.createGain(); this.master.gain.value = 0;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -12; this.limiter.knee.value = 12; this.limiter.ratio.value = 3;
    this.limiter.attack.value = 0.004; this.limiter.release.value = 0.16;
    this.master.connect(this.limiter).connect(context.destination);
    this.whiteNoise = context.createBuffer(1, context.sampleRate * 12, context.sampleRate);
    this.brownNoise = context.createBuffer(1, context.sampleRate * 12, context.sampleRate);
    const white = this.whiteNoise.getChannelData(0), brown = this.brownNoise.getChannelData(0);
    let seed = 1739, low = 0;
    for (let i = 0; i < white.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const random = seed / 2147483648 - 1;
      const seam = Math.min(1, i / 600, (white.length - i) / 600);
      low = (low + random * 0.025) / 1.025;
      white[i] = random * seam; brown[i] = Math.max(-1, Math.min(1, low * 5)) * seam;
    }
    this.railBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.16), context.sampleRate);
    const rail = this.railBuffer.getChannelData(0);
    for (let i = 0; i < rail.length; i++) {
      const t = i / context.sampleRate, attack = Math.min(1, t / 0.003);
      rail[i] = attack * (0.55 * Math.sin(2 * Math.PI * 63 * t) * Math.exp(-t * 38)
        + 0.2 * Math.sin(2 * Math.PI * 116 * t) * Math.exp(-t * 56)
        + 0.16 * white[i] * Math.exp(-t * 80));
    }
    this.rumble = this.bed(this.brownNoise, 'lowpass', 235, 0.65);
    this.wheels = this.bed(this.whiteNoise, 'bandpass', 780, 0.55);
    this.wind = this.bed(this.whiteNoise, 'bandpass', 1500, 0.35);
    this.brake = this.bed(this.whiteNoise, 'bandpass', 1950, 0.65);
    this.pressure = this.bed(this.whiteNoise, 'highpass', 2900, 0.4);
  }
  private bed(buffer: AudioBuffer, type: BiquadFilterType, frequency: number, q: number) {
    const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = this.context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    const gain = this.context.createGain(); gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master); source.start(); this.sources.push(source); this.nodes.push(filter, gain);
    return gain;
  }
  private tone(frequency: number, duration: number, level: number, at: number) {
    if (this.disposed) return;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + 0.035); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(this.master); oscillator.start(at); oscillator.stop(at + duration + 0.02);
    this.contacts.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.contacts.delete(oscillator); };
  }
  private railContact(weight: number, speed: number, at: number) {
    const source = this.context.createBufferSource(); source.buffer = this.railBuffer;
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1700;
    const gain = this.context.createGain(); gain.gain.value = weight * (0.2 + Math.min(1, speed / 0.65) * 0.17);
    source.connect(filter).connect(gain).connect(this.master); source.start(at); source.stop(at + 0.17); this.contacts.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.contacts.delete(source); };
  }
  departure(at = this.context.currentTime) { this.tone(330, 0.65, 0.028, at); this.tone(440, 0.65, 0.012, at); }
  chime(at = this.context.currentTime) { this.tone(660, 0.7, 0.055, at); this.tone(880, 0.8, 0.04, at + 0.14); }
  /** Optional audio time supports deterministic offline metering of the same live engine. */
  update(state: TrainSnapshot, muted: boolean, paused: boolean, at = this.context.currentTime) {
    if (this.disposed) return;
    const velocity = Math.min(1, Math.max(0, state.speed / 0.65));
    this.master.gain.setTargetAtTime(muted || paused ? 0 : 0.75, at, 0.055);
    this.rumble.gain.setTargetAtTime(0.0015 + Math.sqrt(velocity) * 0.18, at, 0.14);
    this.wheels.gain.setTargetAtTime(velocity * 0.065, at, 0.12);
    this.wind.gain.setTargetAtTime(velocity * velocity * 0.018, at, 0.2);
    const braking = state.acceleration < -0.015;
    this.brake.gain.setTargetAtTime(braking ? Math.min(0.025, -state.acceleration * 0.035) : 0, at, 0.12);
    this.pressure.gain.setTargetAtTime(state.travelState === 'BRAKING' && state.speed < 0.18 ? velocity * 0.025 : 0, at, 0.1);
    if (this.lastDistance !== null && !paused && !muted && state.speed > 0.005) {
      for (const contact of railContactsBetween(this.lastDistance, state.currentDistance)) this.railContact(contact.weight, state.speed, at);
    }
    this.lastDistance = state.currentDistance;
    // Chime once after physical braking, before the contextual station card appears.
    if (this.lastState && ((state.travelState === 'ARRIVING' && this.lastState !== 'ARRIVING')
      || (state.travelState === 'STATION_IDLE' && this.lastState === 'RESETTING'))) this.chime(at);
    this.lastState = state.travelState;
  }
  quiet() { this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025); }
  dispose() {
    this.disposed = true;
    for (const node of [...this.sources, ...Array.from(this.contacts)]) { try { node.stop(); } catch { /* ended */ } node.disconnect(); }
    this.sources = []; this.contacts.clear();
    for (const node of this.nodes) node.disconnect();
    this.nodes = []; this.master.disconnect(); this.limiter.disconnect();
  }
}
