import { bookDiagnostics } from "../frames/FrameDiagnostics";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BookGestureController,
  scopedGestureTarget,
  type BookFrameInput,
  type GestureView,
} from "./BookGestureController";
import {
  HandTrackingRuntime,
  runtimeForModel,
  type CameraStatus,
} from "./HandTrackingRuntime";
import { previewPoint, type Landmark } from "./GestureClassifier";
import "./gestures.css";
import { GESTURE_MODELS } from "./GestureModels";

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
const IDLE: GestureView = { mode: "idle", pointer: null, selected: false };
const instructions = {
  idle: "Show a fist to turn pages, or point to select",
  candidate: "Hold your fist briefly to grab the pages",
  fist: "Closed fist · move LEFT to advance, RIGHT to rewind",
  pointer: "Point · move the cursor; pinch to select",
  pinch: "Pinch · selection held; release before selecting again",
};

export function GesturePointer({ view }: { view: GestureView }) {
  return (
    view.pointer && (
      <span
        aria-hidden="true"
        className={`book-gesture-pointer ${view.mode === "pinch" ? "is-pinching" : ""}`}
        style={{ left: view.pointer.x, top: view.pointer.y }}
      />
    )
  );
}
function drawSkeleton(
  canvas: HTMLCanvasElement | null,
  hand: readonly Landmark[] | undefined,
  video: HTMLVideoElement | null
) {
  const ctx = canvas?.getContext("2d");
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!hand || hand.length !== 21) return;
  const points = hand.map(point =>
    previewPoint(
      point,
      canvas.width,
      canvas.height,
      video?.videoWidth || canvas.width,
      video?.videoHeight || canvas.height
    )
  );
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#35c5ff";
  ctx.lineWidth = 2;
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(points[a].x, points[a].y);
    ctx.lineTo(points[b].x, points[b].y);
    ctx.stroke();
  }
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** Mounted only in the opt-in frame-book preview. Never starts a camera from an effect. */
export default function GestureControls({
  scope,
  input,
}: {
  scope: RefObject<HTMLElement | null>;
  input: RefObject<BookFrameInput | null>;
}) {
  const video = useRef<HTMLVideoElement>(null),
    skeleton = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<HandTrackingRuntime | null>(null);
  const modelId = "current";
  const model = GESTURE_MODELS.current;
  const [camera, setCamera] = useState<CameraStatus>("off");
  const [message, setMessage] = useState(
    "Camera off · mouse, touch and keyboard available"
  );
  const [view, setView] = useState<GestureView>(IDLE);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const skeletonEnabled = useRef(showSkeleton);
  skeletonEnabled.current = showSkeleton;
  const hover = useRef<HTMLElement | null>(null);
  const active = camera === "active",
    pending = camera === "loading" || camera === "permission";
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    let mounted = true,
      manualUntil = -Infinity,
      physicalHeld = false;
    const controller = new BookGestureController();
    const clearHover = () => {
      hover.current?.removeAttribute("data-gesture-hover");
      hover.current = null;
    };
    const instance = new HandTrackingRuntime(
      (result, now) => {
        if (!mounted) return;
        const rect = root.getBoundingClientRect();
        const left = Math.max(0, rect.left),
          top = Math.max(0, rect.top);
        const width = Math.max(0, Math.min(innerWidth, rect.right) - left);
        const height = Math.max(0, Math.min(innerHeight, rect.bottom) - top);
        const next = controller.process(
          result,
          now,
          input.current,
          { left, top, width, height },
          physicalHeld || now < manualUntil || width === 0 || height === 0,
          (x, y) => {
            const target = scopedGestureTarget(root, x, y);
            if (!target) return false;
            target.click(); // Explicitly opted-in book control only; no global click dispatch.
            return true;
          }
        );
        clearHover();
        if (next.pointer) {
          hover.current = scopedGestureTarget(
            root,
            next.pointer.x,
            next.pointer.y
          );
          hover.current?.setAttribute("data-gesture-hover", "true");
        }
        const skeletonStarted = performance.now();
        drawSkeleton(
          skeleton.current,
          skeletonEnabled.current ? result.landmarks?.[0] : undefined,
          video.current
        );
        bookDiagnostics()?.record("skeleton", {
          duration: performance.now() - skeletonStarted,
        });
        // Keep pointer motion responsive, but a steady fist/idle pose need not re-render React at inference frequency.
        setView(previous =>
          previous.mode === next.mode &&
          previous.selected === next.selected &&
          previous.pointer?.x === next.pointer?.x &&
          previous.pointer?.y === next.pointer?.y
            ? previous
            : next
        );
      },
      (status, text) => {
        if (mounted) {
          setCamera(status);
          setMessage(text);
        }
      },
      runtimeForModel(modelId)
    );
    runtime.current = instance;
    const manual = () => {
      manualUntil = performance.now() + 650;
      controller.reset();
      clearHover();
      setView(IDLE);
    };
    const down = () => {
      physicalHeld = true;
      manual();
    };
    const up = () => {
      physicalHeld = false;
      manual();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") instance.stop();
      manual();
    };
    const visibility = () => {
      if (document.hidden)
        instance.stop(
          "Camera stopped when tab was hidden. Enable again to resume."
        );
    };
    const pagehide = () => instance.stop();
    root.addEventListener("pointerdown", down, true);
    root.addEventListener("pointermove", manual, true);
    root.addEventListener("keydown", key, true);
    root.addEventListener("wheel", manual, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      instance.stop();
      runtime.current = null;
      controller.reset();
      clearHover();
      root.removeEventListener("pointerdown", down, true);
      root.removeEventListener("pointermove", manual, true);
      root.removeEventListener("keydown", key, true);
      root.removeEventListener("wheel", manual);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [scope, input, modelId]);
  return (
    <aside
      className="book-gesture-controls"
      data-camera-status={camera}
      data-book-model={modelId}
      data-model-sha256={model.sha256}
      aria-label="Optional hand controls"
    >
      <div className="book-gesture-bar">
        <button
          type="button"
          aria-pressed={active}
          onClick={() => {
            if (active || pending) runtime.current?.stop();
            else if (video.current) void runtime.current?.start(video.current);
          }}
        >
          {active || pending ? "Disable Camera" : "Enable Hand Controls"}
        </button>
        <span role="status" aria-live="polite">
          {camera === "active" ? instructions[view.mode] : message}
        </span>
        <details>
          <summary>Hand control guide</summary>
          <p>
            Fist: move left to advance, right to rewind. Point: move the blue
            cursor. Pinch and release: select available book controls. Locked
            chapters stay locked. Move your mouse or use the keyboard to take
            over.
          </p>
        </details>
      </div>
      <p className="book-gesture-privacy">
        Optional camera · processed locally · never transmitted, recorded or
        stored. Browser permission is requested only after enabling.
      </p>
      <div className="book-gesture-camera" hidden={!active && !pending}>
        <div className="book-gesture-preview">
          <video
            ref={video}
            muted
            playsInline
            aria-label="Local mirrored camera preview"
          />
          <canvas
            ref={skeleton}
            width={320}
            height={240}
            hidden={!showSkeleton}
            aria-hidden="true"
          />
        </div>
        <label>
          <input
            type="checkbox"
            checked={showSkeleton}
            onChange={e => setShowSkeleton(e.target.checked)}
          />{" "}
          Show hand landmarks
        </label>
      </div>
      <GesturePointer view={view} />
    </aside>
  );
}
