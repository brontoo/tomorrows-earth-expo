import { describe, expect, it, vi } from "vitest";
import {
  centerOfPalm,
  fistToFrame,
  gesturePreviewEnabled,
  looksLikePointing,
  mirrorX,
  OPTIONS,
  pinchRatio,
  screenPoint,
  previewPoint,
  type HandSample,
  type Landmark,
} from "../client/src/components/book/gestures/GestureClassifier";
import {
  BookGestureController,
  scopedGestureTarget,
  type BookFrameInput,
} from "../client/src/components/book/gestures/BookGestureController";
import {
  HandTrackingRuntime,
  type RuntimeDependencies,
  type Recognizer,
} from "../client/src/components/book/gestures/HandTrackingRuntime";
import { restrictFrame } from "../client/src/components/book/frames/manifest";

function hand(x = 0.5): Landmark[] {
  const h = Array.from({ length: 21 }, () => ({ x, y: 0.6 }));
  h[0].y = 0.91;
  h[9].y = 0.65;
  h[5].y = 0.67;
  h[17].y = 0.69;
  h[4] = { x: x - 0.2, y: 0.5 };
  h[8] = { x, y: 0.27 };
  return h;
}
function sample(category = "Closed_Fist", x = 0.5, pinch = false): HandSample {
  const h = hand(x);
  if (pinch) h[4] = { x: x + 0.01, y: 0.27 };
  return {
    landmarks: [h],
    gestures: [[{ categoryName: category, score: 0.9 }]],
  };
}
const scope = { left: 20, top: 40, width: 1000, height: 600 };
function port(
  start = 100,
  ranges = [{ startInclusive: 0, endExclusive: 239 }]
) {
  let frame = start;
  const seek = vi.fn((value: number) => {
    frame = restrictFrame(value, frame, ranges);
  });
  const input: BookFrameInput = {
    frameCount: 1673,
    getFrame: () => frame,
    isAvailable: () => true,
    seekTo: seek,
  };
  return { input, seek };
}

describe("Original 7E gesture behavior with educational guards", () => {
  it("keeps prototype direction, exact sensitivity and deadzone", () => {
    expect(mirrorX(0.8)).toBeCloseTo(0.2);
    expect(fistToFrame(100, 0.8, 0.4, 1673, 425, 0.014)).toBe(264);
    expect(fistToFrame(100, 0.3, 0.8, 1673, 425, 0.014)).toBe(0);
    expect(fistToFrame(130, 0.5, 0.507, 1673, 425, 0.014)).toBe(130);
    expect(fistToFrame(1670, 0.9, 0, 1673)).toBe(1672);
  });
  it("uses scale-independent pinch and original pointing math", () => {
    expect(
      pinchRatio(sample("Pointing_Up", 0.5, true).landmarks![0])
    ).toBeLessThan(0.43);
    expect(pinchRatio(hand())).toBeGreaterThan(0.64);
    expect(pinchRatio(null)).toBe(Infinity);
    expect(looksLikePointing([])).toBe(false);
    expect(centerOfPalm(hand())?.x).toBe(0.5);
    expect(previewPoint({ x: 0, y: 0 }, 320, 240, 1280, 720)).toEqual({
      x: 320,
      y: 30,
    });
    expect(previewPoint({ x: 1, y: 1 }, 320, 240, 1280, 720)).toEqual({
      x: 0,
      y: 210,
    });
    const p = screenPoint(hand(0.15), 1920, 1080, 0.1);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThanOrEqual(1920);
  });
  it("waits for a stable fist, anchors without jumping, moves proportionally and stops immediately on release", () => {
    const c = new BookGestureController(),
      { input, seek } = port();
    expect(c.process(sample(), 0, input, scope, false, () => false).mode).toBe(
      "candidate"
    );
    c.process(sample("Closed_Fist", 0.7), 68, input, scope, false, () => false);
    expect(seek).not.toHaveBeenCalled();
    c.process(
      sample("Closed_Fist", 0.7),
      140,
      input,
      scope,
      false,
      () => false
    );
    expect(input.getFrame()).toBe(100);
    c.process(
      sample("Closed_Fist", 0.9),
      210,
      input,
      scope,
      false,
      () => false
    );
    expect(input.getFrame()).toBeGreaterThan(100); // mirrored palm moves left
    const n = seek.mock.calls.length;
    c.process(sample("Open_Palm"), 280, input, scope, false, () => false);
    expect(seek).toHaveBeenCalledTimes(n);
  });
  it("respects generic structural media gaps supplied to the test port", () => {
    const c = new BookGestureController(),
      { input } = port(500, [
        { startInclusive: 0, endExclusive: 239 },
        { startInclusive: 478, endExclusive: 717 },
      ]);
    c.process(sample(), 0, input, scope, false, () => false);
    c.process(sample(), 140, input, scope, false, () => false);
    for (let i = 1; i < 12; i++)
      c.process(
        sample("Closed_Fist", 0),
        140 + i * 70,
        input,
        scope,
        false,
        () => false
      );
    expect(input.getFrame()).toBe(478);
  });
  it("clamps to media bounds and will not scrub unavailable/busy inputs", () => {
    const c = new BookGestureController(),
      { input, seek } = port(237);
    c.process(sample(), 0, input, scope, false, () => false);
    c.process(sample(), 140, input, scope, false, () => false);
    for (let i = 1; i < 12; i++)
      c.process(
        sample("Closed_Fist", 1),
        140 + i * 70,
        input,
        scope,
        false,
        () => false
      );
    expect(input.getFrame()).toBe(238);
    seek.mockClear();
    input.isAvailable = () => false;
    expect(
      c.process(sample(), 1100, input, scope, false, () => false).mode
    ).toBe("idle");
    expect(seek).not.toHaveBeenCalled();
  });
  it("smooths and mirrors the pointer within the visible book scope", () => {
    const c = new BookGestureController();
    const a = c.process(
      sample("Pointing_Up", 0.2),
      0,
      null,
      scope,
      false,
      () => false
    ).pointer!;
    const b = c.process(
      sample("Pointing_Up", 0.8),
      70,
      null,
      scope,
      false,
      () => false
    ).pointer!;
    expect(b.x).toBeLessThan(a.x);
    expect(b.x).toBeGreaterThan(20);
    expect(b.y).toBeGreaterThanOrEqual(40);
    expect(b.y).toBeLessThanOrEqual(640);
  });
  it("selects once per stable pinch/release cycle, with hysteresis and cooldown", () => {
    const c = new BookGestureController(),
      click = vi.fn(() => true);
    c.process(sample("Pointing_Up"), 0, null, scope, false, click);
    c.process(sample("Closed_Fist", 0.5, true), 70, null, scope, false, click);
    c.process(sample("Closed_Fist", 0.5, true), 170, null, scope, false, click);
    for (let t = 240; t < 1200; t += 70)
      c.process(sample("Closed_Fist", 0.5, true), t, null, scope, false, click);
    expect(click).toHaveBeenCalledTimes(1); // held pinch never becomes a fist after pointer grace
    c.process(sample("Pointing_Up"), 1250, null, scope, false, click);
    c.process(
      sample("Pointing_Up", 0.5, true),
      1320,
      null,
      scope,
      false,
      click
    );
    c.process(
      sample("Pointing_Up", 0.5, true),
      1420,
      null,
      scope,
      false,
      click
    );
    expect(click).toHaveBeenCalledTimes(2);
  });
  it("retains a held pinch through the release hysteresis band", () => {
    const c = new BookGestureController(),
      click = vi.fn(() => true);
    c.process(sample("Pointing_Up"), 0, null, scope, false, click);
    c.process(sample("Pointing_Up", 0.5, true), 70, null, scope, false, click);
    c.process(sample("Pointing_Up", 0.5, true), 170, null, scope, false, click);
    const middle = sample("Pointing_Up", 0.5, true);
    middle.landmarks![0][4] = { x: 0.5 + 0.26 * 0.55, y: 0.27 };
    expect(c.process(middle, 240, null, scope, false, click).mode).toBe(
      "pinch"
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(
      c.process(sample("Pointing_Up"), 310, null, scope, false, click).mode
    ).toBe("pointer");
  });
  it("does not duplicate a click during cooldown or trigger before dwell", () => {
    const c = new BookGestureController(),
      click = vi.fn(() => true);
    c.process(sample("Pointing_Up"), 0, null, scope, false, click);
    for (const t of [10, 70, 110])
      c.process(sample("Pointing_Up", 0.5, true), t, null, scope, false, click);
    expect(click).toHaveBeenCalledTimes(1);
    c.process(sample("Pointing_Up"), 180, null, scope, false, click);
    for (const t of [200, 300, 900])
      c.process(sample("Pointing_Up", 0.5, true), t, null, scope, false, click);
    expect(click).toHaveBeenCalledTimes(1);
  });
  it("hides on tracking loss and resets anchors after any physical input", () => {
    const c = new BookGestureController(),
      { input, seek } = port();
    c.process(sample("Pointing_Up"), 0, input, scope, false, () => false);
    expect(
      c.process({}, 70, input, scope, false, () => false).pointer
    ).toBeNull();
    c.process(sample(), 140, input, scope, false, () => false);
    c.process(sample(), 280, input, scope, false, () => false);
    const count = seek.mock.calls.length;
    c.process(sample("Closed_Fist", 1), 350, input, scope, true, () => false);
    expect(seek).toHaveBeenCalledTimes(count);
    expect(
      c.process(sample(), 420, input, scope, false, () => false).mode
    ).toBe("candidate");
  });
  it("rejects hits outside the book, disabled controls and unmarked browser/platform buttons", () => {
    const target = {
      closest: vi.fn(() => null),
      matches: vi.fn((s: string) => s.includes("button, a")),
      getClientRects: () => [{}],
      click: vi.fn(),
    };
    const root = {
      ownerDocument: { elementFromPoint: () => ({ closest: () => target }) },
      contains: () => false,
    };
    expect(
      scopedGestureTarget(root as unknown as HTMLElement, 1, 2)
    ).toBeNull();
    root.contains = () => true;
    expect(scopedGestureTarget(root as unknown as HTMLElement, 1, 2)).toBe(
      target
    );
    target.matches = vi.fn(() => true);
    expect(
      scopedGestureTarget(root as unknown as HTMLElement, 1, 2)
    ).toBeNull();
    root.ownerDocument.elementFromPoint = () => ({
      closest: () => null as unknown as typeof target,
    });
    expect(
      scopedGestureTarget(root as unknown as HTMLElement, 1, 2)
    ).toBeNull();
  });
  it("defaults off and requires BOTH frame preview and gesture opt-in", () => {
    expect(gesturePreviewEnabled(undefined, undefined)).toBe(false);
    expect(gesturePreviewEnabled("legacy", "true")).toBe(false);
    expect(gesturePreviewEnabled("frames", undefined)).toBe(false);
    expect(gesturePreviewEnabled("frames", "true")).toBe(true);
  });
});

function runtimeHarness() {
  const stop = vi.fn(),
    close = vi.fn(),
    recognizeForVideo = vi.fn(() => ({}));
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const recognizer: Recognizer = { close, recognizeForVideo };
  const callbacks: FrameRequestCallback[] = [];
  const deps: RuntimeDependencies = {
    createRecognizer: vi.fn(async () => recognizer),
    getCamera: vi.fn(async () => stream),
    raf: vi.fn(cb => {
      callbacks.push(cb);
      return callbacks.length;
    }),
    cancelRaf: vi.fn(),
  };
  const video = {
    srcObject: null,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    readyState: 2,
    currentTime: 0,
  } as unknown as HTMLVideoElement;
  const status = vi.fn(),
    sampleResult = vi.fn();
  const runtime = new HandTrackingRuntime(sampleResult, status, deps);
  return {
    runtime,
    deps,
    video,
    status,
    stop,
    close,
    callbacks,
    recognizeForVideo,
    sampleResult,
    stream,
    recognizer,
  };
}
describe("single owner camera lifecycle", () => {
  it("does no camera/model work until explicit start, and repeated start does not duplicate streams", async () => {
    const h = runtimeHarness();
    expect(h.deps.getCamera).not.toHaveBeenCalled();
    await Promise.all([h.runtime.start(h.video), h.runtime.start(h.video)]);
    expect(h.deps.getCamera).toHaveBeenCalledTimes(1);
    h.runtime.stop();
    expect(h.stop).toHaveBeenCalledTimes(1);
    expect(h.close).toHaveBeenCalledTimes(1);
    expect(h.video.srcObject).toBeNull();
    await h.runtime.start(h.video);
    h.runtime.stop();
    expect(h.stop).toHaveBeenCalledTimes(2);
  });
  it("denial releases model and reports permission failure", async () => {
    const h = runtimeHarness();
    h.deps.getCamera = vi.fn(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    await h.runtime.start(h.video);
    expect(h.close).toHaveBeenCalledTimes(1);
    expect(h.status).toHaveBeenLastCalledWith(
      "error",
      expect.stringContaining("permission denied")
    );
  });
  it("stops a late camera stream after route unmount/disable", async () => {
    const h = runtimeHarness();
    let resolve!: (stream: MediaStream) => void;
    h.deps.getCamera = () =>
      new Promise(r => {
        resolve = r;
      });
    const started = h.runtime.start(h.video);
    await Promise.resolve();
    h.runtime.stop();
    resolve(h.stream);
    await started;
    expect(h.stop).toHaveBeenCalledTimes(1);
    expect(h.close).toHaveBeenCalledTimes(1);
    expect(h.video.srcObject).toBeNull();
  });
  it("does not request a camera when a late model resolves after unmount", async () => {
    const h = runtimeHarness();
    let resolve!: (recognizer: Recognizer) => void;
    h.deps.createRecognizer = () =>
      new Promise(r => {
        resolve = r;
      });
    const started = h.runtime.start(h.video);
    h.runtime.stop();
    resolve(h.recognizer);
    await started;
    expect(h.deps.getCamera).not.toHaveBeenCalled();
    expect(h.close).toHaveBeenCalledTimes(1);
  });
  it("closes a recognizer if an old pending permission request rejects after disable", async () => {
    const h = runtimeHarness();
    let reject!: (error: Error) => void;
    h.deps.getCamera = () =>
      new Promise((_r, j) => {
        reject = j;
      });
    const started = h.runtime.start(h.video);
    await Promise.resolve();
    h.runtime.stop();
    reject(new Error("denied"));
    await started;
    expect(h.close).toHaveBeenCalledTimes(1);
  });
  it("does not restart a loop when video play completes after disable", async () => {
    const h = runtimeHarness();
    let resolve!: () => void;
    h.video.play = () =>
      new Promise<void>(r => {
        resolve = r;
      });
    const started = h.runtime.start(h.video);
    await Promise.resolve();
    await Promise.resolve();
    h.runtime.stop();
    resolve();
    await started;
    expect(h.deps.raf).not.toHaveBeenCalled();
    expect(h.stop).toHaveBeenCalledTimes(1);
    expect(h.close).toHaveBeenCalledTimes(1);
  });
  it("does not schedule another frame when a sample causes route cleanup", async () => {
    const h = runtimeHarness();
    h.sampleResult.mockImplementation(() => h.runtime.stop());
    // stop emits an empty sample too; detach the callback before invoking stop.
    h.sampleResult.mockImplementationOnce(() => {
      h.sampleResult.mockReset();
      h.runtime.stop();
    });
    await h.runtime.start(h.video);
    h.callbacks[0](100);
    expect(h.callbacks).toHaveLength(1);
    expect(h.stop).toHaveBeenCalledTimes(1);
  });
  it("limits inference to new video frames and the prototype 68ms interval; stops on inference error", async () => {
    const h = runtimeHarness();
    await h.runtime.start(h.video);
    h.callbacks.at(-1)!(100);
    h.callbacks.at(-1)!(180);
    expect(h.recognizeForVideo).toHaveBeenCalledTimes(1);
    h.video.currentTime = 0.1;
    h.callbacks.at(-1)!(190);
    expect(h.recognizeForVideo).toHaveBeenCalledTimes(2);
    h.video.currentTime = 0.2;
    h.callbacks.at(-1)!(200);
    expect(h.recognizeForVideo).toHaveBeenCalledTimes(2);
    h.recognizeForVideo.mockImplementation(() => {
      throw new Error("GPU lost");
    });
    h.callbacks.at(-1)!(280);
    expect(h.stop).toHaveBeenCalledTimes(1);
    expect(h.close).toHaveBeenCalledTimes(1);
  });
});
