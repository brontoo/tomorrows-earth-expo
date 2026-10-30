/** Short, procedural exterior ambience on the journal's existing AudioContext. */
export class PlatformAmbience {
  private master: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private disposed = false;
  private entering = false;
  private fading = false;
  private air: GainNode;
  constructor(private context: BaseAudioContext) {
    this.master = context.createGain(); this.master.gain.value = 0; this.master.connect(context.destination);
    const noise = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
    const data = noise.getChannelData(0);
    const airNoise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const airData = airNoise.getChannelData(0);
    let seed = 4817, low = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const random = seed / 2147483648 - 1;
      if (i < airData.length) airData[i] = random;
      low = (low + random * .025) / 1.025;
      data[i] = low * Math.min(1, i / 300, (data.length - i) / 300);
    }
    const source = context.createBufferSource(); source.buffer = noise; source.loop = true;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 430;
    const gain = context.createGain(); gain.gain.value = .7;
    source.connect(filter).connect(gain).connect(this.master); source.start();
    this.sources.push(source); this.nodes.push(filter, gain);
    const airSource = context.createBufferSource(); airSource.buffer = airNoise; airSource.loop = true;
    const airFilter = context.createBiquadFilter(); airFilter.type = 'bandpass'; airFilter.frequency.value = 1300; airFilter.Q.value = .5;
    this.air = context.createGain(); this.air.gain.value = 0;
    airSource.connect(airFilter).connect(this.air).connect(this.master); airSource.start();
    this.sources.push(airSource); this.nodes.push(airFilter, this.air);
    const hum = context.createOscillator(); hum.frequency.value = 86; hum.type = 'sine';
    const humGain = context.createGain(); humGain.gain.value = .006;
    hum.connect(humGain).connect(this.master); hum.start(); this.sources.push(hum); this.nodes.push(humGain);
  }
  setMuted(muted: boolean) {
    if (this.disposed) return;
    this.master.gain.setTargetAtTime(muted || this.fading ? 0 : this.entering ? .45 : .3, this.context.currentTime, .12);
  }
  confirm(duration = 1.5) {
    if (this.disposed) return;
    this.entering = true;
    const at = this.context.currentTime;
    this.air.gain.setValueAtTime(0, at);
    this.air.gain.linearRampToValueAtTime(.035, at + .25);
    this.air.gain.linearRampToValueAtTime(0, at + duration);
    for (const [frequency, delay] of [[540, 0], [720, .12]]) {
      const tone = this.context.createOscillator(); const gain = this.context.createGain();
      tone.frequency.value = frequency; gain.gain.setValueAtTime(0, at + delay);
      gain.gain.linearRampToValueAtTime(.025, at + delay + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, at + delay + .45);
      tone.connect(gain).connect(this.master); tone.start(at + delay); tone.stop(at + delay + .5);
      this.sources.push(tone); this.nodes.push(gain);
    }
  }
  fadeIntoCabin() {
    if (this.disposed) return;
    this.fading = true;
    const at = this.context.currentTime;
    this.master.gain.cancelScheduledValues(at);
    this.master.gain.setValueAtTime(this.master.gain.value, at);
    this.master.gain.linearRampToValueAtTime(0, at + .65);
  }
  dispose() {
    this.disposed = true;
    for (const source of this.sources) { try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
    for (const node of this.nodes) node.disconnect();
    this.sources = []; this.nodes = []; this.master.disconnect();
  }
}
