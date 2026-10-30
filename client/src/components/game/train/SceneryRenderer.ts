import { CABIN_SIZE, journeyScenes, WINDOW } from './journeyScenes';
import { smoothstep, type TrainSnapshot } from './TrainJourneyEngine';

/** Only current/lookahead artwork is decoded eagerly. Original JPEGs remain unchanged. */
export class SceneCache {
  private images = new Map<number, HTMLImageElement>();
  private pending = new Map<number, Promise<void>>();
  readonly failed = new Set<number>();
  private active = true;
  private preparedKey = "";
  load(index: number): Promise<void> {
    if (!journeyScenes[index] || this.images.has(index)) return Promise.resolve();
    const pending = this.pending.get(index); if (pending) return pending;
    if (this.failed.has(index)) return Promise.resolve();
    const task = (async () => {
      const image = new Image(); image.decoding = 'async'; image.src = journeyScenes[index].image;
      try { await image.decode(); if (this.active) this.images.set(index, image); }
      catch { if (this.active) this.failed.add(index); }
      finally { this.pending.delete(index); }
    })();
    this.pending.set(index, task); return task;
  }
  prepare(scene: number, next: number) {
    const key = `${scene}:${next}`;
    if (key !== this.preparedKey) {
      this.preparedKey = key;
      for (const index of Array.from(new Set([scene, next, next + 1, next + 2]))) void this.load(index);
    }
    // Bound decoded memory. The HTTP cache keeps other assets cheap to revisit.
    if (this.images.size > 9) for (const index of Array.from(this.images.keys())) {
      if (![scene, next, next + 1, next + 2].includes(index)) this.images.delete(index);
      if (this.images.size <= 8) break;
    }
    return this.images.has(scene) && this.images.has(next);
  }
  image(index: number) { return this.images.get(index); }
  dispose() { this.active = false; this.images.clear(); }
}

export class SceneryRenderer {
  private context: CanvasRenderingContext2D;
  private aperture = new Image();
  private apertureRaster = document.createElement('canvas');
  get ready() { return this.aperture.complete && this.aperture.naturalWidth > 0; }
  constructor(private canvas: HTMLCanvasElement, readonly cache: SceneCache) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas rendering is unavailable');
    this.context = context;
    this.aperture.decoding = 'async';
    this.aperture.src = '/train/window-mask.png';
  }
  resize() {
    const width = Math.max(640, Math.min(1920, this.canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)));
    this.canvas.width = Math.round(width); this.canvas.height = Math.round(width * CABIN_SIZE.height / CABIN_SIZE.width);
  }
  private picture(index: number, x: number, pan = 0, width = WINDOW.width) {
    const image = this.cache.image(index); if (!image) return;
    const c = this.context;
    c.save(); c.beginPath(); c.rect(x, WINDOW.y, width + 2, WINDOW.height); c.clip();
    const scale = Math.max(WINDOW.width / image.width, WINDOW.height / image.height) * 1.06;
    const iw = image.width * scale, ih = image.height * scale;
    c.drawImage(image, x + (WINDOW.width - iw) / 2 - pan * WINDOW.width * 0.035, WINDOW.y + (WINDOW.height - ih) / 2, iw, ih);
    c.restore();
  }
  draw(s: TrainSnapshot, reduced: boolean) {
    if (!this.ready) return;
    const c = this.context;
    c.setTransform(this.canvas.width / CABIN_SIZE.width, 0, 0, this.canvas.height / CABIN_SIZE.height, 0, 0);
    c.clearRect(WINDOW.x, WINDOW.y, WINDOW.width, WINDOW.height);
    c.save(); c.beginPath(); c.rect(WINDOW.x, WINDOW.y, WINDOW.width, WINDOW.height); c.clip();
    c.fillStyle = '#3c303d'; c.fillRect(WINDOW.x, WINDOW.y, WINDOW.width, WINDOW.height);
    const p = s.sceneProgress; const w = WINDOW.width; const h = WINDOW.height;
    const transition = journeyScenes[s.scene].transition;
    if (reduced) {
      this.picture(p < 0.5 ? s.scene : s.destinationScene, WINDOW.x);
      c.fillStyle = `rgba(43,31,46,${(1 - Math.min(1, Math.abs(p - 0.5) * 12)) * 0.5})`;
      c.fillRect(WINDOW.x, WINDOW.y, w, h);
    } else if (s.scene === s.destinationScene) this.picture(s.scene, WINDOW.x);
    else if (s.mode === 'preview') {
      const wipeStart = s.destinationScene === 28 ? 0.45 : 0.91;
      const handoff = Math.max(0, Math.min(1, (p - wipeStart) / 0.09));
      this.picture(handoff < 0.5 ? s.scene : s.destinationScene, WINDOW.x, p * 2 - 1);
      // Close, sparse structures convey speed while the landmark itself remains readable.
      const pole = ((s.currentDistance * 1.9) % 1) * (w + 140);
      c.fillStyle = '#504837'; c.fillRect(WINDOW.x + w - pole, WINDOW.y, 12, h);
      c.fillRect(WINDOW.x + w - pole - 42, WINDOW.y + 145, 96, 9);
      if (handoff > 0) {
        if (transition === 'tunnel' || transition === 'haze') {
          const alpha = smoothstep(Math.min(1, (1 - Math.abs(handoff - 0.5) * 2) * 1.6));
          c.fillStyle = transition === 'haze' ? `rgba(228,215,185,${alpha})` : `rgba(25,22,31,${alpha})`;
          c.fillRect(WINDOW.x, WINDOW.y, w, h);
        } else {
          const x = WINDOW.x + w * (1.2 - handoff * 3.4);
          c.fillStyle = transition === 'passing-train' ? '#403a4c' : '#a78768';
          c.fillRect(x, WINDOW.y, w * 1.6, h);
          if (transition === 'passing-train') {
            c.fillStyle = '#acb6a4';
            for (let i = 0; i < 6; i++) c.fillRect(x + w * (0.04 + i * 0.255), WINDOW.y + h * 0.24, w * 0.18, h * 0.34);
          }
        }
      }
    }
    else if (transition === 'wall') {
      // Adjacent panoramas move continuously left. A nearby bridge pier conceals the seam.
      this.picture(s.scene, WINDOW.x - p * w, p);
      this.picture(s.destinationScene, WINDOW.x + (1 - p) * w, p - 1);
      const x = WINDOW.x + (1 - p) * w;
      c.fillStyle = '#a78768'; c.fillRect(x - w * 0.025, WINDOW.y, w * 0.05, h);
      c.fillStyle = '#d7bd96'; c.fillRect(x - w * 0.018, WINDOW.y, w * 0.008, h);
    } else {
      // Pan restrained flattened artwork, swapping only under complete window coverage.
      this.picture(p < 0.5 ? s.scene : s.destinationScene, WINDOW.x, (p < 0.5 ? p : p - 0.5) * 2);
      if (transition === 'tunnel' || transition === 'haze') {
        const cover = smoothstep(1 - Math.abs(p - 0.5) * 3.2);
        c.fillStyle = transition === 'haze' ? `rgba(228,215,185,${cover})` : `rgba(25,22,31,${cover})`;
        c.fillRect(WINDOW.x, WINDOW.y, w, h);
      } else {
        const x = WINDOW.x + w * (2 - p * 4.4);
        c.fillStyle = '#403a4c'; c.fillRect(x, WINDOW.y, w * 1.25, h);
        c.fillStyle = '#c4ad84'; c.fillRect(x, WINDOW.y + h * 0.72, w * 1.25, h * 0.035);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = '#8c9b95'; c.fillRect(x + w * (0.04 + i * 0.245), WINDOW.y + h * 0.22, w * 0.17, h * 0.36);
          c.fillStyle = '#655d66'; c.fillRect(x + w * (0.22 + i * 0.245), WINDOW.y, w * 0.01, h);
        }
      }
    }
    if (s.cover > 0) { c.fillStyle = `rgba(22,19,27,${s.cover})`; c.fillRect(WINDOW.x, WINDOW.y, w, h); }
    // Reflections strengthen in a tunnel, clipped by the same artwork-derived aperture.
    const glass = c.createLinearGradient(WINDOW.x, WINDOW.y, WINDOW.x + w, WINDOW.y + h);
    glass.addColorStop(0, `rgba(255,237,220,${0.045 + s.cover * 0.1})`); glass.addColorStop(0.45, 'rgba(255,255,255,0)'); glass.addColorStop(1, 'rgba(112,77,101,0.035)');
    c.fillStyle = glass; c.fillRect(WINDOW.x, WINDOW.y, w, h);
    // Bake the exact existing aperture into this frame's alpha, avoiding a second
    // full-size CSS mask/compositor pass whenever the suspension moves the cabin.
    if (this.apertureRaster.width !== this.canvas.width || this.apertureRaster.height !== this.canvas.height) {
      this.apertureRaster.width = this.canvas.width; this.apertureRaster.height = this.canvas.height;
      this.apertureRaster.getContext('2d')?.drawImage(this.aperture, 0, 0, this.canvas.width, this.canvas.height);
    }
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(this.apertureRaster, 0, 0, CABIN_SIZE.width, CABIN_SIZE.height);
    c.restore();
  }
}
