import { useEffect, useRef, useState } from "react";
import type { EmirateChapterId, FrameManifest, FrameRange } from "./contracts";
import { loadFrameImage, restrictFrame, scrubRange } from "./manifest";
import "./frames.css";

interface Props {
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
  const cache = useRef(new Map<number, ImageBitmap>());
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
      position.current = selected.restingFrame;
      setRequested(selected.restingFrame);
    }
  }, [selected]);

  useEffect(
    () => () => {
      cache.current.forEach(image => image.close());
      cache.current.clear();
    },
    [manifest.mediaVersion, baseUrl]
  );

  useEffect(() => {
    const abort = new AbortController();
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
      let image = cache.current.get(target);
      if (!image) {
        image = await loadFrameImage(manifest, target, baseUrl, abort.signal);
        if (abort.signal.aborted) {
          image.close();
          return;
        }
      }
      cache.current.delete(target);
      cache.current.set(target, image);
      draw(image);
      // 8 full-size decoded images = about 63 MiB. No whole-sequence decoding.
      while (cache.current.size > 8) {
        const oldest = cache.current.keys().next().value!;
        cache.current.get(oldest)?.close();
        cache.current.delete(oldest);
      }
    };
    void run().catch(reason => {
      if (!abort.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "Frame unavailable"
        );
    });
    return () => abort.abort();
  }, [target, attempt, accessKey, manifest, baseUrl]);

  const seek = (value: number) => {
    if (!interactive) return;
    const next = restrictFrame(value, position.current, allowedRanges);
    position.current = next;
    setRequested(next);
  };
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
