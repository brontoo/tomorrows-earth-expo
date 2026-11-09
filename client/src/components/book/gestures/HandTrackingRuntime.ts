import { OPTIONS, type HandSample } from "./GestureClassifier";

// Same SDK version as original prototype; versioned model and matching WASM.
export const HAND_RESOURCES = Object.freeze({
  sdkVersion: "1.2.2",
  wasm: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm",
  model:
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
});
export interface Recognizer {
  recognizeForVideo(video: HTMLVideoElement, timestamp: number): HandSample;
  close(): void;
}
export interface RuntimeDependencies {
  createRecognizer(): Promise<Recognizer>;
  getCamera(): Promise<MediaStream>;
  raf(callback: FrameRequestCallback): number;
  cancelRaf(id: number): void;
}
/** Shared by explicit camera opt-in and the independent browser acceptance probe. */
export async function createBookRecognizer(): Promise<Recognizer> {
  const { FilesetResolver, GestureRecognizer } = await import(
    "@mediapipe/tasks-vision"
  );
  const vision = await FilesetResolver.forVisionTasks(HAND_RESOURCES.wasm);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: HAND_RESOURCES.model, delegate },
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
  try {
    return await GestureRecognizer.createFromOptions(vision, options("GPU"));
  } catch {
    return GestureRecognizer.createFromOptions(vision, options("CPU"));
  }
}

const dependencies: RuntimeDependencies = {
  createRecognizer: createBookRecognizer,
  getCamera() {
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      return Promise.reject(
        new Error("Camera requires HTTPS or localhost and a supported browser.")
      );
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 },
      },
    });
  },
  raf: cb => requestAnimationFrame(cb),
  cancelRaf: id => cancelAnimationFrame(id),
};
export type CameraStatus =
  | "off"
  | "loading"
  | "permission"
  | "active"
  | "error";

/** Sole camera/recognizer owner for this book mount. No global script or provider. */
export class HandTrackingRuntime {
  private generation = 0;
  private running = false;
  private starting = false;
  private stream: MediaStream | null = null;
  private recognizer: Recognizer | null = null;
  private raf = 0;
  private video: HTMLVideoElement | null = null;
  private ended = () =>
    this.stop("Camera disconnected. Enable again to retry.");
  constructor(
    private sample: (sample: HandSample, now: number) => void,
    private status: (status: CameraStatus, message: string) => void,
    private deps: RuntimeDependencies = dependencies
  ) {}
  stop(message = "Camera off · mouse, touch and keyboard available") {
    this.generation++;
    this.running = false;
    this.starting = false;
    this.deps.cancelRaf(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach(track => {
      track.removeEventListener?.("ended", this.ended);
      track.stop();
    });
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    this.video = null;
    try {
      this.recognizer?.close();
    } catch {
      /* already released */
    }
    this.recognizer = null;
    this.sample({}, performance.now());
    this.status("off", message);
  }
  async start(video: HTMLVideoElement) {
    if (this.running || this.starting) return;
    const id = ++this.generation;
    this.starting = true;
    this.status("loading", "Loading MediaPipe hand model…");
    let recognizer: Recognizer | null = null;
    let stream: MediaStream | null = null;
    let installed = false;
    try {
      recognizer = await this.deps.createRecognizer();
      if (id !== this.generation) {
        recognizer.close();
        return;
      }
      this.status("permission", "Allow camera access in your browser…");
      stream = await this.deps.getCamera();
      if (id !== this.generation) {
        stream.getTracks().forEach(t => t.stop());
        recognizer.close();
        return;
      }
      this.recognizer = recognizer;
      this.stream = stream;
      this.video = video;
      installed = true;
      stream
        .getTracks()
        .forEach(track => track.addEventListener?.("ended", this.ended));
      video.srcObject = stream;
      await video.play();
      if (id !== this.generation) return;
      this.starting = false;
      this.running = true;
      this.status(
        "active",
        "Show a fist to turn pages, or point and pinch to select"
      );
      let lastVideoTime = -1,
        lastInference = -Infinity;
      const tick = (now: number) => {
        if (!this.running || id !== this.generation) return;
        try {
          if (
            video.readyState >= 2 &&
            video.currentTime !== lastVideoTime &&
            now - lastInference >= OPTIONS.inferenceIntervalMs
          ) {
            lastVideoTime = video.currentTime;
            lastInference = now;
            this.sample(recognizer!.recognizeForVideo(video, now), now);
          }
          if (this.running && id === this.generation)
            this.raf = this.deps.raf(tick);
        } catch {
          this.stop();
          this.status(
            "error",
            "Hand tracking stopped. Disable and re-enable to retry."
          );
        }
      };
      this.raf = this.deps.raf(tick);
    } catch (error) {
      if (id !== this.generation) {
        if (!installed) {
          try {
            recognizer?.close();
          } catch {}
          stream?.getTracks().forEach(t => t.stop());
        }
        return;
      }
      // If not yet installed in the instance, release the local initialization resource.
      if (recognizer && recognizer !== this.recognizer) {
        try {
          recognizer.close();
        } catch {}
      }
      if (stream && stream !== this.stream)
        stream.getTracks().forEach(t => t.stop());
      this.stop();
      const name = error instanceof Error ? error.name : "";
      this.status(
        "error",
        name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access and try again."
          : name === "NotFoundError"
            ? "No camera found. Mouse, touch and keyboard remain available."
            : "Could not start hand tracking. Check HTTPS, model access and camera availability."
      );
    }
  }
}
