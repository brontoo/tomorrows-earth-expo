/** One gesture-unlocked context, shared for the lifetime of the mounted book. */
export class BookAudio {
  private context: AudioContext | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  muted = true;
  unlock() {
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => undefined);
    } catch {
      /* Audio is optional. */
    }
  }
  play(kind: "open" | "turn" | "fold" | "stamp") {
    const ctx = this.context;
    if (!ctx || this.muted || document.hidden || ctx.state !== "running")
      return;
    const duration = kind === "open" ? 0.65 : kind === "stamp" ? 0.16 : 0.35;
    const buffer = ctx.createBuffer(
      1,
      ctx.sampleRate * duration,
      ctx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / data.length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = kind === "stamp" ? 170 : 1700;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.065;
    source.connect(filter).connect(gain).connect(ctx.destination);
    this.track(source);
    source.start();
    if (kind === "stamp") {
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const tone = ctx.createOscillator();
        const envelope = ctx.createGain();
        tone.frequency.value = frequency;
        envelope.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
        envelope.gain.exponentialRampToValueAtTime(
          0.025,
          ctx.currentTime + i * 0.09 + 0.02
        );
        envelope.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + i * 0.09 + 0.6
        );
        tone.connect(envelope).connect(ctx.destination);
        this.track(tone);
        tone.start(ctx.currentTime + i * 0.09);
        tone.stop(ctx.currentTime + i * 0.09 + 0.65);
      });
    }
  }
  private track(source: AudioScheduledSourceNode) {
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      this.voices.delete(source);
    };
  }
  silence() {
    this.voices.forEach(source => {
      try {
        source.stop();
      } catch {
        /* ended */
      }
    });
    this.voices.clear();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.silence();
  }
  visibility() {
    if (document.hidden) {
      this.silence();
      void this.context?.suspend();
    } else if (!this.muted) void this.context?.resume().catch(() => undefined);
  }
  dispose() {
    this.silence();
    void this.context?.close();
    this.context = null;
  }
}
