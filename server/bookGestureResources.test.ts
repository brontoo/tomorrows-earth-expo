import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  resolve: vi.fn(async () => ({ runtime: "test-only" })),
  create: vi.fn(),
}));
vi.mock(
  "../client/src/components/book/gestures/GestureModels",
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import("../client/src/components/book/gestures/GestureModels")
      >();
    return {
      ...actual,
      loadGestureModel: vi.fn(async () => new Uint8Array([1, 2, 3])),
    };
  }
);
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: sdk.resolve },
  GestureRecognizer: { createFromOptions: sdk.create },
}));
import {
  createBookRecognizer,
  HAND_RESOURCES,
} from "../client/src/components/book/gestures/HandTrackingRuntime";

describe("production recognizer factory (SDK mocked for unit tests only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("importing the runtime does not load WASM, create a model or request a camera", () => {
    expect(sdk.resolve).not.toHaveBeenCalled();
    expect(sdk.create).not.toHaveBeenCalled();
  });
  it("explicit creation retains the current pinned model and one-hand VIDEO configuration", async () => {
    const recognizer = { close: vi.fn(), recognizeForVideo: vi.fn() };
    sdk.create.mockResolvedValueOnce(recognizer);
    expect(await createBookRecognizer()).toBe(recognizer);
    expect(sdk.resolve).toHaveBeenCalledWith(HAND_RESOURCES.wasm);
    expect(sdk.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        baseOptions: {
          modelAssetBuffer: new Uint8Array([1, 2, 3]),
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      })
    );
    expect(recognizer.close).not.toHaveBeenCalled(); // Ownership passes to the runtime.
  });
  it("does not create or fetch an original model outside development A/B mode", async () => {
    vi.stubEnv("DEV", false);
    try {
      await expect(createBookRecognizer("prototype")).rejects.toThrow(
        "development A/B preview"
      );
      expect(sdk.resolve).not.toHaveBeenCalled();
      expect(sdk.create).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("GPU initialization failure falls back to CPU using the identical model and settings", async () => {
    const recognizer = { close: vi.fn(), recognizeForVideo: vi.fn() };
    sdk.create
      .mockRejectedValueOnce(new Error("GPU unsupported"))
      .mockResolvedValueOnce(recognizer);
    expect(await createBookRecognizer()).toBe(recognizer);
    const options = sdk.create.mock.calls.map(call => call[1]);
    expect(options[0].baseOptions.delegate).toBe("GPU");
    expect(options[1].baseOptions.modelAssetBuffer).not.toBe(
      options[0].baseOptions.modelAssetBuffer
    );
    expect(options[1]).toEqual({
      ...options[0],
      baseOptions: { ...options[0].baseOptions, delegate: "CPU" },
    });
  });
});
