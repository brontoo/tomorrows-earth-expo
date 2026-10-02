/**
 * journalMotion — محرّك الحركة والصوت لأسلوب «دفتر الميدان».
 *
 * المبادئ:
 *  - إضافي بالكامل: لا يستبدل أي منطق قائم، فقط يضيف حركة وصوتًا.
 *  - الحركة فيزيائية ورقية (ختم، اهتزاز ورق، ارتسام حبر) لا توهّج نيون.
 *  - الصوت مولَّد برمجيًا بـWeb Audio: صفر ملفات، صفر تراخيص، صفر تحميل.
 *  - يحترم prefers-reduced-motion: من يفضّل تقليل الحركة لا يُحرَّك له شيء.
 *  - يتحرك بـtransform/opacity/clip-path فقط → لا إعادة تخطيط → سلاسة على أجهزة المدرسة.
 */
import gsap from "gsap";

const hasWindow = typeof window !== "undefined";

/** هل يفضّل المستخدم تقليل الحركة؟ */
export const prefersReducedMotion = (): boolean =>
  hasWindow && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

/* ------------------------------------------------------------------ *
 *  الصوت: توليد برمجي (Web Audio)
 * ------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;
let muted = false;

const getAudio = (): AudioContext | null => {
  if (!hasWindow) return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
};

const noiseBuffer = (ctx: AudioContext, dur: number): AudioBuffer => {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

type NoiseArgs = {
  dur?: number;
  gain?: number;
  type?: BiquadFilterType;
  freq?: number;
  q?: number;
  sweepTo?: number;
  delay?: number;
};

const noise = (
  ctx: AudioContext,
  { dur = 0.18, gain = 0.13, type = "bandpass", freq = 1200, q = 0.9, sweepTo, delay = 0 }: NoiseArgs,
) => {
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t0 + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(env).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
};

type ToneArgs = {
  freq?: number;
  to?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  delay?: number;
};

const tone = (
  ctx: AudioContext,
  { freq = 180, to, dur = 0.22, gain = 0.16, type = "sine", delay = 0 }: ToneArgs,
) => {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.04);
};

/** يشغّل مؤثرًا واحدًا مع تجاهل أخطاء سياسة التشغيل التلقائي. */
const play = (fn: (ctx: AudioContext) => void) => {
  if (muted) return;
  try {
    const ctx = getAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    fn(ctx);
  } catch {
    /* المتصفح منع الصوت قبل تفاعل المستخدم — نتجاهل بهدوء */
  }
};

export const journalSfx = {
  get muted(): boolean {
    return muted;
  },
  setMuted(value: boolean): void {
    muted = value;
    if (!muted) play(() => undefined);
  },
  toggle(): boolean {
    journalSfx.setMuted(!muted);
    if (!muted) journalSfx.pin();
    return muted;
  },
  /** طرقة ختم مطاطي */
  stamp(): void {
    play((ctx) => {
      tone(ctx, { freq: 168, to: 52, dur: 0.26, gain: 0.3 });
      noise(ctx, { dur: 0.1, gain: 0.2, type: "lowpass", freq: 1500 });
      noise(ctx, { dur: 0.05, gain: 0.08, type: "highpass", freq: 3200 });
    });
  },
  /** قلب صفحة ورقية */
  flip(): void {
    play((ctx) => noise(ctx, { dur: 0.36, gain: 0.12, type: "bandpass", freq: 620, sweepTo: 2300, q: 0.6 }));
  },
  /** خدش قلم رصاص */
  pencil(): void {
    play((ctx) => noise(ctx, { dur: 0.08, gain: 0.05, type: "highpass", freq: 2600 }));
  },
  /** نفخة غبار ورق */
  puff(): void {
    play((ctx) => noise(ctx, { dur: 0.3, gain: 0.1, type: "lowpass", freq: 760, sweepTo: 150 }));
  },
  /** دبوس/ملصق يُلصق */
  pin(): void {
    play((ctx) => tone(ctx, { freq: 520, to: 320, dur: 0.13, gain: 0.13, type: "triangle" }));
  },
  /** رنّة إنجاز */
  chime(): void {
    play((ctx) => {
      tone(ctx, { freq: 880, dur: 0.5, gain: 0.11 });
      tone(ctx, { freq: 1320, dur: 0.5, gain: 0.07, delay: 0.09 });
    });
  },
};

/* ------------------------------------------------------------------ *
 *  حركات جاهزة (GSAP)
 * ------------------------------------------------------------------ */

/** ختم ينزل: يبدأ كبيرًا وشفافًا ثم يستقر مع ارتداد بسيط. */
export function stampIn(
  el: Element | null,
  { delay = 0, intensity = 1 }: { delay?: number; intensity?: number } = {},
): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 + 0.5 * intensity, rotate: -4 * intensity, opacity: 0.15 },
    { scale: 1, rotate: 0, opacity: 1, duration: 0.42, delay, ease: "back.out(2.4)" },
  );
}

/** اهتزاز الورق عند ضغط الختم. */
export function paperShake(el: Element | null, intensity = 2): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { x: -intensity },
    { x: intensity, duration: 0.06, repeat: 3, yoyo: true, ease: "none", onComplete: () => gsap.set(el, { x: 0 }) },
  );
}

/** ذرات غبار تتطاير من عقدة/عنصر. */
export function puffAt(host: Element | null, count = 4): void {
  if (!host || prefersReducedMotion()) return;
  for (let i = 0; i < count; i += 1) {
    const speck = document.createElement("span");
    speck.className = "fj-speck";
    speck.style.left = `${50 + (Math.random() * 22 - 11)}%`;
    speck.style.top = `${74 + Math.random() * 10}%`;
    host.appendChild(speck);
    gsap.fromTo(
      speck,
      { x: 0, y: 0, scale: 1, opacity: 0.85 },
      {
        x: Math.random() * 26 - 13,
        y: 10 + Math.random() * 16,
        scale: 0.3,
        opacity: 0,
        duration: 0.52 + Math.random() * 0.18,
        onComplete: () => speck.remove(),
      },
    );
  }
}

/** حلقة حبر تتوسّع من عنصر (تأكيد لمس). */
export function inkRing(host: Element | null, clay = false): void {
  if (!host || prefersReducedMotion()) return;
  const ring = document.createElement("span");
  ring.className = `fj-ripple${clay ? " clay" : ""}`;
  host.appendChild(ring);
  gsap.fromTo(
    ring,
    { scale: 0.5, opacity: 0.6 },
    { scale: 1.7, opacity: 0, duration: 0.62, onComplete: () => ring.remove() },
  );
}

/** ارتسام مسار SVG تدريجيًا. */
export function drawStroke(path: SVGPathElement | null, duration = 0.9, delay = 0): gsap.core.Tween | null {
  if (!path || prefersReducedMotion() || typeof path.getTotalLength !== "function") return null;
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  return gsap.to(path, { strokeDashoffset: 0, duration, delay, ease: "power1.inOut" });
}

/** كشف تدريجي بحبر متدرّج (بدل الظهور المفاجئ). */
export function inkReveal(el: Element | null, { delay = 0, duration = 0.8 } = {}): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)", filter: "blur(5px)" },
    { clipPath: "inset(0 0% 0 0)", filter: "blur(0px)", duration, delay, ease: "power2.out" },
  );
}

/**
 * كتابة النص حرفًا بحرف (مع خدش قلم خفيف).
 * يحفظ النص الأصلي في data-fj-text حتى يمكن تكرار التشغيل أو إعادة الرسم بأمان.
 */
export function typewriter(el: HTMLElement | null, speed = 22): Promise<void> {
  if (!el) return Promise.resolve();
  const original = el.dataset.fjText ?? el.textContent ?? "";
  el.dataset.fjText = original;
  if (prefersReducedMotion()) {
    el.textContent = original;
    return Promise.resolve();
  }
  el.textContent = "";
  return new Promise((resolve) => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      el.textContent = original.slice(0, index);
      if (index % 4 === 0) journalSfx.pencil();
      if (index >= original.length) {
        window.clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

/** موجة تنفّس هادئة (يستمر حتى الإيقاف). */
export function breathe(el: Element | null, amount = 6, duration = 4.6): gsap.core.Tween | null {
  if (!el || prefersReducedMotion()) return null;
  return gsap.to(el, { y: -amount, rotate: 0.6, duration, repeat: -1, yoyo: true, ease: "sine.inOut" });
}