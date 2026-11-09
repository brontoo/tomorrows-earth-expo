import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { EmirateChapterId, FrameManifest, FrameRange } from "./contracts";
import { restrictFrame, scrubRange } from "./manifest";
import { FrameScheduler, desktopPolicy, mobilePolicy } from "./FrameScheduler";
import "./frames.css";
import type { BookFrameInput } from "../gestures/BookGestureController";

interface Props {
  gestureInput?: RefObject<BookFrameInput | null>;
  manifest: FrameManifest;
  baseUrl: string;
  chapter: number;
  allowedRanges: readonly FrameRange[];
  reduced: boolean;
  interactive: boolean;
  onChapter: (id: EmirateChapterId) => void;
  onReady: () => void;
  onFallback: () => void;
}

/** React adaptation of 7E-Book's canvas/drag interaction. No camera or educational writes. */
export default function FrameBookPlayer({
  gestureInput,
  manifest,
  baseUrl,
  chapter,
  allowedRanges,
  reduced,
  interactive,
  onChapter,
  onReady,
  onFallback,
}: Props) {
  const selected = manifest.chapters[chapter];
  const [requested, setRequested] = useState(selected.restingFrame);
  const [displayed, setDisplayed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mobile] = useState(
    () =>
      matchMedia("(max-width: 767px)").matches ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
        8) <= 4
  );
  const scheduler = useMemo(
    () =>
      new FrameScheduler(
        manifest,
        baseUrl,
        mobile ? mobilePolicy : desktopPolicy
      ),
    [manifest, baseUrl, mobile]
  );
  const direction = useRef<1 | -1>(1);
  const position = useRef(requested);
  const drag = useRef<{ id: number; x: number; frame: number } | null>(null);
  const callbacks = useRef({ onChapter, onReady });
  callbacks.current = { onChapter, onReady };
  const permitted = allowedRanges.some(
    r => requested >= r.startInclusive && requested < r.endExclusive
  );
  const target = permitted ? requested : selected.restingFrame;
  const accessKey = allowedRanges
    .map(r => `${r.startInclusive}:${r.endExclusive}`)
    .join(",");

  useEffect(() => {
    if (
      position.current < selected.startInclusive ||
      position.current >= selected.endExclusive
    ) {
      direction.current = selected.restingFrame > position.current ? 1 : -1;
      position.current = selected.restingFrame;
      setRequested(selected.restingFrame);
    }
  }, [selected]);

  useEffect(() => () => scheduler.dispose(), [scheduler]);

  useEffect(() => {
    let current = true;
    const draw = (image: ImageBitmap) => {
      const context = canvas.current?.getContext("2d", { alpha: false });
      if (!context) throw new Error("Full HD canvas is unavailable");
      context.drawImage(image, 0, 0, 1920, 1080);
      setDisplayed(target);
      setError(null);
      const active = manifest.chapters.find(
        c => target >= c.startInclusive && target < c.endExclusive
      )!;
      callbacks.current.onChapter(active.chapterId);
      callbacks.current.onReady();
    };
    const run = async () => {
      if (
        !allowedRanges.some(
          r => target >= r.startInclusive && target < r.endExclusive
        )
      ) {
        canvas.current?.getContext("2d")?.clearRect(0, 0, 1920, 1080);
        setDisplayed(null);
        return;
      }
      const oldChapter = manifest.chapters.find(
        c =>
          displayed !== null &&
          displayed >= c.startInclusive &&
          displayed < c.endExclusive
      );
      const newChapter = manifest.chapters.find(
        c => target >= c.startInclusive && target < c.endExclusive
      );
      if (oldChapter && oldChapter !== newChapter) {
        canvas.current?.getContext("2d")?.clearRect(0, 0, 1920, 1080);
        setDisplayed(null);
      }
      const image = await scheduler.request(
        target,
        allowedRanges,
        direction.current
      );
      if (!current) return;
      draw(image);
    };
    void run().catch(reason => {
      if (current)
        setError(
          reason instanceof Error ? reason.message : "Frame unavailable"
        );
    });
    return () => {
      current = false;
    };
  }, [target, attempt, accessKey, manifest, scheduler]);

  const seek = (value: number) => {
    if (!interactive) return;
    const next = restrictFrame(value, position.current, allowedRanges);
    if (next !== position.current)
      direction.current = next > position.current ? 1 : -1;
    position.current = next;
    setRequested(next);
  };
  // Stable presentation port; reads fresh guards and routes every gesture through seek().
  const gestureLive = useRef({ seek, interactive });
  gestureLive.current = { seek, interactive };
  useEffect(() => {
    if (!gestureInput) return;
    gestureInput.current = {
      frameCount: manifest.frameCount,
      getFrame: () => position.current,
      isAvailable: () =>
        gestureLive.current.interactive && drag.current === null,
      seekTo: frame => gestureLive.current.seek(frame),
    };
    return () => {
      gestureInput.current = null;
    };
  }, [gestureInput, manifest.frameCount]);
  const range = scrubRange(target, allowedRanges) ?? selected;
  useEffect(() => {
    if (!interactive || displayed === null) return;
    const active = manifest.chapters.find(
      c => displayed >= c.startInclusive && displayed < c.endExclusive
    );
    if (active && active.chapterId !== selected.chapterId) {
      callbacks.current.onChapter(active.chapterId);
      callbacks.current.onReady();
    }
  }, [interactive, displayed, selected.chapterId, manifest]);
  const finish = (element: HTMLCanvasElement, pointerId: number) => {
    drag.current = null;
    if (element.hasPointerCapture(pointerId))
      element.releasePointerCapture(pointerId);
  };
  return (
    <div
      className="frame-book-player"
      data-frame-requested={target}
      data-frame-displayed={displayed ?? ""}
      data-frame-policy={mobile ? "mobile" : "desktop"}
    >
      <canvas
        ref={canvas}
        width={1920}
        height={1080}
        tabIndex={0}
        role="group"
        aria-label={`Full HD book, ${selected.chapterId}. Drag left to advance, right to reverse. Arrow keys step frames.`}
        onKeyDown={event => {
          let value: number | undefined;
          if (event.key === "ArrowRight")
            value = position.current + (event.shiftKey ? 24 : 1);
          if (event.key === "ArrowLeft")
            value = Math.max(0, position.current - (event.shiftKey ? 24 : 1));
          if (event.key === "Home") value = range.startInclusive;
          if (event.key === "End") value = range.endExclusive - 1;
          if (value !== undefined) {
            event.preventDefault();
            seek(value);
          }
        }}
        onPointerDown={event => {
          if (!interactive || event.button !== 0 || !event.isPrimary) return;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            frame: position.current,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
        }}
        onPointerMove={event => {
          const held = drag.current;
          if (!held || held.id !== event.pointerId) return;
          const delta = Math.round(
            ((held.x - event.clientX) /
              Math.max(350, event.currentTarget.clientWidth)) *
              (selected.endExclusive - selected.startInclusive)
          );
          seek(Math.max(0, held.frame + delta));
        }}
        onPointerUp={event => finish(event.currentTarget, event.pointerId)}
        onPointerCancel={event => finish(event.currentTarget, event.pointerId)}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      />
      <div className="frame-book-controls">
        <button
          type="button"
          data-book-gesture="frame-step"
          onClick={() => seek(Math.max(0, target - 1))}
          disabled={!interactive || target === range.startInclusive}
        >
          Previous frame
        </button>
        <label>
          Book frame
          <input
            type="range"
            min={range.startInclusive}
            max={range.endExclusive - 1}
            step={1}
            value={target}
            disabled={!interactive}
            onChange={event => seek(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          data-book-gesture="frame-step"
          onClick={() => seek(target + 1)}
          disabled={!interactive || target === range.endExclusive - 1}
        >
          Next frame
        </button>
        <output aria-live="off">
          {displayed === null
            ? "Loading"
            : `Frame ${displayed} / ${manifest.frameCount - 1}`}
        </output>
        {reduced && (
          <span>Reduced motion: frames move only with your input.</span>
        )}
        {error ? (
          <div role="alert">
            {error}{" "}
            <button type="button" onClick={() => setAttempt(n => n + 1)}>
              Retry frame
            </button>{" "}
            <button type="button" onClick={onFallback}>
              Use legacy book
            </button>
          </div>
        ) : (
          displayed !== target && (
            <span role="status">Loading requested frame…</span>
          )
        )}
      </div>
    </div>
  );
}
