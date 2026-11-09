import { useEffect, useRef, useState, type RefObject } from "react";
import type { EmirateChapterId, FrameManifest } from "./contracts";
import { FrameScheduler, adaptivePolicy } from "./FrameScheduler";
import { FrameTimeline, type TimelineState } from "./FrameTimeline";
import { bookDiagnostics } from "./FrameDiagnostics";
import type { BookFrameInput } from "../gestures/BookGestureController";
import "./frames.css";
interface Props {
  gestureInput?: RefObject<BookFrameInput | null>;
  manifest: FrameManifest;
  baseUrl: string;
  chapter: number;
  reduced: boolean;
  interactive: boolean;
  initialFrame?: number;
  firstFrameUrl?: string;
  initialFrameBytes?: ArrayBuffer;
  /** Explicit user navigation is separate from the chapter inferred from a displayed frame. */
  navigation?: { serial: number; frame: number };
  followChapterProp?: boolean;
  onChapter: (id: EmirateChapterId) => void;
  onFrameDisplayed?: (frame: number) => void;
  onReady: () => void;
  onFallback: () => void;
}
export default function FrameBookPlayer(props: Props) {
  const { manifest, baseUrl, chapter, reduced, gestureInput, firstFrameUrl } =
    props;
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    slider = useRef<HTMLInputElement>(null);
  const timeline = useRef<FrameTimeline | null>(null);
  const live = useRef(props);
  live.current = props;
  const initial = useRef(
    props.initialFrame ?? manifest.chapters[chapter].restingFrame
  );
  const [view, setView] = useState<TimelineState>({
    requested: initial.current,
    displayed: null,
    error: null,
  });
  const drag = useRef<{ id: number; x: number; frame: number } | null>(null);
  const lastUI = useRef(-Infinity);
  const lastView = useRef(view);
  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    // Wide tablets also need the mobile budget; viewport width alone is insufficient.
    const mobile =
      matchMedia("(max-width:767px)").matches ||
      /Android|iPhone|iPad/i.test(nav.userAgent) ||
      (/Macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1);
    const scheduler = new FrameScheduler(
      manifest,
      baseUrl,
      adaptivePolicy({
        mobile,
        deviceMemory: nav.deviceMemory,
        saveData: nav.connection?.saveData,
      })
    );
    if (live.current.initialFrameBytes)
      scheduler.seedEncoded(0, live.current.initialFrameBytes);
    let lastChapter = -1,
      first = true;
    const context = canvas.current?.getContext("2d", { alpha: false });
    const player = new FrameTimeline(
      scheduler,
      (image, frame) => {
        if (!context) throw new Error("Full HD canvas is unavailable");
        context.drawImage(image, 0, 0, 1920, 1080);
        // Never change canvas width/height, clear it or hide a successful image while loading.
        canvas.current!.style.visibility = "visible";
        root.current?.setAttribute("data-frame-displayed", String(frame));
        const active = manifest.chapters.findIndex(
          c => frame >= c.startInclusive && frame < c.endExclusive
        );
        live.current.onFrameDisplayed?.(frame);
        if (active !== lastChapter) {
          lastChapter = active;
          live.current.onChapter(manifest.chapters[active].chapterId);
        }
        if (first || live.current.followChapterProp !== false) {
          first = false;
          live.current.onReady();
        }
      },
      state => {
        root.current?.setAttribute(
          "data-frame-requested",
          String(state.requested)
        );
        if (slider.current) slider.current.value = String(state.requested);
        // Painting is imperative. React status updates are bounded, with exact settled/error updates.
        const now = performance.now();
        const previous = lastView.current;
        if (
          (state.requested !== previous.requested ||
            state.displayed !== previous.displayed ||
            state.error !== previous.error) &&
          (now - lastUI.current >= 100 ||
            state.error ||
            state.displayed === state.requested)
        ) {
          lastUI.current = now;
          lastView.current = state;
          setView(state);
        }
        bookDiagnostics()?.record("scheduler", scheduler.stats);
      },
      initial.current
    );
    timeline.current = player;
    if (root.current) {
      root.current.dataset.framePolicy = mobile ? "mobile" : "desktop";
      root.current.dataset.schedulerId = String(performance.now());
    }
    if (gestureInput)
      gestureInput.current = {
        frameCount: manifest.frameCount,
        getFrame: () => player.state.requested,
        isAvailable: () => live.current.interactive && drag.current === null,
        seekTo: frame => {
          if (live.current.interactive) player.seek(frame);
        },
      };
    return () => {
      timeline.current = null;
      if (gestureInput) gestureInput.current = null;
      player.dispose();
    };
  }, [manifest, baseUrl, gestureInput]);
  useEffect(() => {
    if (props.followChapterProp !== false)
      timeline.current?.seek(manifest.chapters[chapter].restingFrame);
  }, [chapter, manifest, props.followChapterProp]);
  useEffect(() => {
    if (props.navigation) timeline.current?.seek(props.navigation.frame);
  }, [props.navigation]);
  const seek = (frame: number) => {
    if (live.current.interactive) timeline.current?.seek(frame);
  };
  const position = () => timeline.current?.state.requested ?? initial.current;
  const finish = (el: HTMLCanvasElement, id: number) => {
    drag.current = null;
    if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
  };
  return (
    <div
      className="frame-book-player"
      ref={root}
      data-frame-requested={initial.current}
      data-frame-displayed=""
    >
      <div className="frame-book-surface">
        {firstFrameUrl && view.displayed === null && (
          <img
            className="frame-book-placeholder"
            src={firstFrameUrl}
            alt="Original Seven Emirates closed book"
            aria-hidden={view.displayed !== null}
          />
        )}
        <canvas
          ref={canvas}
          width={1920}
          height={1080}
          style={{ visibility: view.displayed === null ? "hidden" : "visible" }}
          tabIndex={0}
          role="group"
          aria-label={`Full HD book, ${manifest.chapters[chapter].chapterId}. Drag left to advance, right to reverse. Arrow keys step frames.`}
          onKeyDown={e => {
            let n: number | undefined;
            if (e.key === "ArrowRight") n = position() + (e.shiftKey ? 24 : 1);
            if (e.key === "ArrowLeft") n = position() - (e.shiftKey ? 24 : 1);
            if (e.key === "Home") n = 0;
            if (e.key === "End") n = manifest.frameCount - 1;
            if (n !== undefined) {
              e.preventDefault();
              seek(n);
            }
          }}
          onPointerDown={e => {
            if (!props.interactive || e.button !== 0 || !e.isPrimary) return;
            drag.current = { id: e.pointerId, x: e.clientX, frame: position() };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.focus();
          }}
          onPointerMove={e => {
            const held = drag.current;
            if (!held || held.id !== e.pointerId) return;
            seek(
              held.frame +
                Math.round(
                  ((held.x - e.clientX) /
                    Math.max(350, e.currentTarget.clientWidth)) *
                    239
                )
            );
          }}
          onPointerUp={e => finish(e.currentTarget, e.pointerId)}
          onPointerCancel={e => finish(e.currentTarget, e.pointerId)}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        />
      </div>
      <div className="frame-book-controls">
        <button
          type="button"
          data-book-gesture="frame-step"
          onClick={() => seek(position() - 1)}
          disabled={!props.interactive || view.requested === 0}
        >
          Previous frame
        </button>
        <label>
          Book frame
          <input
            ref={slider}
            type="range"
            min={0}
            max={manifest.frameCount - 1}
            step={1}
            defaultValue={initial.current}
            disabled={!props.interactive}
            onChange={e => seek(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          data-book-gesture="frame-step"
          onClick={() => seek(position() + 1)}
          disabled={
            !props.interactive || view.requested === manifest.frameCount - 1
          }
        >
          Next frame
        </button>
        <output aria-live="off">
          {view.displayed === null
            ? "Loading original book"
            : `Frame ${view.displayed} / ${manifest.frameCount - 1}`}
        </output>
        {reduced && (
          <span>Reduced motion: frames move only with your input.</span>
        )}
        {view.error ? (
          <div role="alert">
            {view.error}{" "}
            <button type="button" onClick={() => timeline.current?.retry()}>
              Retry frame
            </button>
            {props.followChapterProp !== false && (
              <button type="button" onClick={props.onFallback}>
                Use legacy book
              </button>
            )}
          </div>
        ) : (
          view.displayed !== view.requested && (
            <span role="status">Loading requested frame…</span>
          )
        )}
      </div>
    </div>
  );
}
