import { Camera, CameraOff, Hand } from "lucide-react";
import { useEffect, useRef } from "react";
import { useGesture } from "@/contexts/GestureContext";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "/mediapipe/wasm";
const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function GestureModeToggle() {
  const { isActive, isCameraEnabled, stream, recognitionStatus, recognitionError, startGestureMode, stopGestureMode, emitCommand, setRecognitionStatus, updatePointer } = useGesture();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!isActive || !stream) return;
    let cancelled = false;
    let animationFrame = 0;
    let landmarker: { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { landmarks?: Array<Array<{ x: number; y: number; z: number }>> }; close: () => void } | null = null;
    let lastCommandAt = 0;
    let previousPalm: { x: number; y: number; time: number } | null = null;
    let previousGap: number | null = null;
    let previousTime = 0;

    const run = async () => {
      if (videoRef.current) await new Promise<void>((resolve) => {
        if (videoRef.current?.readyState && videoRef.current.readyState >= 2) resolve();
        else videoRef.current?.addEventListener("loadeddata", () => resolve(), { once: true });
      });
      setRecognitionStatus("loading");
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      setRecognitionStatus("active");
      const tick = () => {
        if (cancelled || !landmarker || !videoRef.current || videoRef.current.readyState < 2) return;
        const now = performance.now();
        const result = landmarker.detectForVideo(videoRef.current, now);
        const hands = result.landmarks ?? [];
        const hand = hands[0];
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          const context = canvas.getContext("2d");
          context?.clearRect(0, 0, width, height);
          context?.save();
          context!.strokeStyle = "rgba(255,255,255,0.9)";
          context!.fillStyle = "rgba(34,211,238,0.95)";
          context!.lineWidth = Math.max(2, width / 320);
          hands.forEach((landmarks) => {
            HAND_CONNECTIONS.forEach(([from, to]) => {
              context!.beginPath();
              context!.moveTo(landmarks[from].x * width, landmarks[from].y * height);
              context!.lineTo(landmarks[to].x * width, landmarks[to].y * height);
              context!.stroke();
            });
            landmarks.forEach((landmark) => {
              context!.beginPath();
              context!.arc(landmark.x * width, landmark.y * height, Math.max(3, width / 160), 0, Math.PI * 2);
              context!.fill();
            });
          });
          context!.restore();
        }
        if (hand) {
          const thumb = hand[4];
          const index = hand[8];
          updatePointer({ x: 1 - index.x, y: index.y });
          const wrist = hand[0];
          const pinch = distance(thumb, index) < 0.075;
          const fingersUp = [8, 12, 16, 20].filter((tip) => hand[tip].y < hand[tip - 2].y).length;
          const openPalm = fingersUp >= 4 && distance(hand[8], wrist) > 0.22;
          const currentX = index.x;
          const elapsed = now - previousTime;
          const currentY = index.y;
          const palm = { x: (hand[0].x + hand[5].x + hand[9].x + hand[13].x + hand[17].x) / 5, y: (hand[0].y + hand[5].y + hand[9].y + hand[13].y + hand[17].y) / 5 };
          const palmDelta = previousPalm ? { x: palm.x - previousPalm.x, y: palm.y - previousPalm.y, time: now - previousPalm.time } : { x: 0, y: 0, time: 0 };
          const velocity = palmDelta.time > 0 ? palmDelta.x / palmDelta.time : 0;
          const verticalVelocity = palmDelta.time > 0 ? palmDelta.y / palmDelta.time : 0;
          const canTrigger = now - lastCommandAt > 450;
          if (hands.length >= 2 && canTrigger) {
            const handGap = distance(hands[0][0], hands[1][0]);
            const gapDelta = previousGap === null ? 0 : handGap - previousGap;
            if (Math.abs(gapDelta) > 0.018) {
              emitCommand({ command: gapDelta > 0 ? "ZOOM_IN" : "ZOOM_OUT", confidence: 0.8 });
              lastCommandAt = now;
            }
            previousGap = handGap;
          } else if (canTrigger && openPalm && Math.abs(velocity) > 0.00045 && Math.abs(palmDelta.x) > 0.08) {
            emitCommand({ command: velocity > 0 ? "SWIPE_RIGHT" : "SWIPE_LEFT", confidence: 0.8, x: currentX, y: index.y });
            lastCommandAt = now;
          } else if (canTrigger && pinch) {
            emitCommand({ command: "SELECT", confidence: 0.85, x: index.x, y: index.y });
            lastCommandAt = now;
          } else if (canTrigger && openPalm) {
            emitCommand({ command: "PAUSE", confidence: 0.8, x: index.x, y: index.y });
            lastCommandAt = now;
          }
          if (canTrigger && openPalm && Math.abs(verticalVelocity) > 0.00045 && Math.abs(palmDelta.y) > 0.08) {
            emitCommand({ command: verticalVelocity < 0 ? "SWIPE_UP" : "SWIPE_DOWN", confidence: 0.8, x: currentX, y: currentY });
            lastCommandAt = now;
          } else if (canTrigger && currentY < 0.28) {
            emitCommand({ command: "SWIPE_UP", confidence: 0.7, x: currentX, y: currentY });
            lastCommandAt = now;
          } else if (canTrigger && currentY > 0.72) {
            emitCommand({ command: "SWIPE_DOWN", confidence: 0.7, x: currentX, y: currentY });
            lastCommandAt = now;
          }
          previousPalm = { ...palm, time: now };
          previousTime = now;
        }
        animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
    };
    run().catch((error) => {
      setRecognitionStatus("error", error instanceof Error ? error.message : "Could not load hand recognition");
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close();
    };
  }, [emitCommand, isActive, stream, updatePointer]);

  const toggle = async () => {
    if (isActive) {
      stopGestureMode();
      return;
    }
    await startGestureMode();
  };

  return <><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start gap-3"><Hand className="mt-0.5 h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="font-bold text-foreground">Gesture mode</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Camera access is local only. White lines show the tracked hand landmarks. Video is not recorded or uploaded.</p></div><button type="button" onClick={toggle} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10">{isActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{isActive ? "Turn off camera" : "Start gesture mode"}</button></div></div>{isActive && <div className="fixed bottom-4 right-4 z-[90] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-cyan-300/40 bg-slate-950 p-2 shadow-2xl"><div className="relative aspect-video overflow-hidden rounded-xl bg-black"><video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Local gesture camera preview" /><canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" aria-hidden="true" /></div><div className="flex items-center justify-between gap-3 px-2 py-2"><p className="text-[11px] font-semibold text-white">{recognitionStatus === "active" ? "Hand tracking active" : recognitionStatus === "loading" ? "Loading hand tracking..." : recognitionStatus === "error" ? "Hand tracking failed" : isCameraEnabled ? "Starting hand tracking..." : "Camera permission is required"}</p><button type="button" onClick={stopGestureMode} className="rounded-lg px-2 py-1 text-[11px] font-bold text-cyan-200 hover:bg-white/10">Close camera</button></div>{recognitionError && <p className="px-2 pb-2 text-[11px] text-red-300">{recognitionError}</p>}</div>}</>;
}
