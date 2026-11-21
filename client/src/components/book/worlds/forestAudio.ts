/** Procedural ambience with separate UI and environment gains. Created on explicit opt-in. */
export function enableForestAudio() {
  const audio = new AudioContext();
  const master = audio.createGain(),
    ambience = audio.createGain(),
    cues = audio.createGain();
  master.gain.value = 0.34;
  ambience.gain.value = 0.36;
  cues.gain.value = 0.23;
  ambience.connect(master);
  cues.connect(master);
  master.connect(audio.destination);

  const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    low = low * 0.94 + (Math.random() * 2 - 1) * 0.06;
    samples[i] =
      low * (0.54 + 0.32 * Math.sin((i / samples.length) * Math.PI * 8));
  }
  const water = audio.createBufferSource(),
    filter = audio.createBiquadFilter();
  water.buffer = buffer;
  water.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 930;
  water.connect(filter);
  filter.connect(ambience);
  water.start();
  let submerged = false;
  let tide = 47;
  function updateFilter() {
    filter.frequency.setTargetAtTime(
      submerged ? 235 - tide * 0.9 : 820 + tide * 2.4,
      audio.currentTime,
      0.3
    );
  }

  function note(
    frequency: number,
    end: number,
    start: number,
    time: number,
    bus: GainNode,
    volume: number
  ) {
    const tone = audio.createOscillator(),
      gain = audio.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(frequency, start);
    tone.frequency.exponentialRampToValueAtTime(end, start + time);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, start + time);
    tone.connect(gain);
    gain.connect(bus);
    tone.start(start);
    tone.stop(start + time);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
    };
  }

  const birds = window.setInterval(() => {
    if (submerged || document.hidden || audio.state !== "running") return;
    note(1990, 1430, audio.currentTime, 0.32, ambience, 0.042);
    note(2250, 1650, audio.currentTime + 0.24, 0.24, ambience, 0.033);
  }, 11600);
  const wake = audio.resume();
  return {
    wake,
    setUnderwater(value: boolean) {
      submerged = value;
      updateFilter();
    },
    setTide(value: number) {
      tide = value;
      updateFilter();
    },
    setAmbience(value: number) {
      ambience.gain.setTargetAtTime(value * 0.005, audio.currentTime, 0.07);
    },
    setCues(value: number) {
      cues.gain.setTargetAtTime(value * 0.004, audio.currentTime, 0.07);
    },
    discover() {
      note(415, 520, audio.currentTime, 0.32, cues, 0.23);
      note(611, 683, audio.currentTime + 0.15, 0.4, cues, 0.15);
    },
    transition() {
      note(220, 105, audio.currentTime, 0.38, cues, 0.19);
    },
    close() {
      window.clearInterval(birds);
      water.stop();
      void audio.close();
    },
  };
}
