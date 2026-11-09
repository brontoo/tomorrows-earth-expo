import { describe, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import {
  GESTURE_MODELS,
  selectGestureModel,
  verifyModelBytes,
  loadGestureModel,
} from "../client/src/components/book/gestures/GestureModels";

describe("Owner-approved Model B and byte integrity", () => {
  it("keeps the owner-approved B model in every environment", () => {
    expect(selectGestureModel("current")).toBe(GESTURE_MODELS.current);
    for (const obsoleteABFlag of [false, true])
      expect(() => selectGestureModel("prototype", obsoleteABFlag)).toThrow(
        "Model B"
      );
  });
  it("keeps current production selection and rejects original or unknown choices outside preview", () => {
    expect(selectGestureModel("current", false)).toBe(GESTURE_MODELS.current);
    expect(() => selectGestureModel("prototype", true)).toThrow("Model B");
    for (const key of [
      "prototype",
      "unknown",
      "https://untrusted.invalid/model",
    ])
      expect(() => selectGestureModel(key, false)).toThrow();
    expect(() => selectGestureModel("unknown", true)).toThrow();
  });
  it("pins the two actual CI-verified artifacts separately", () => {
    expect(GESTURE_MODELS.prototype.sha256).toBe(
      "a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1"
    );
    expect(GESTURE_MODELS.current.sha256).toBe(
      "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482"
    );
    expect(GESTURE_MODELS.prototype.sha256).not.toBe(
      GESTURE_MODELS.current.sha256
    );
  });
  it("returns only verified byte buffers and rejects any byte change", async () => {
    vi.stubGlobal("crypto", webcrypto);
    try {
      const bytes = new TextEncoder().encode("unit-test-model-bytes").buffer;
      const sha = createHash("sha256")
        .update(new Uint8Array(bytes))
        .digest("hex");
      expect(await verifyModelBytes(bytes, sha)).toEqual(new Uint8Array(bytes));
      await expect(verifyModelBytes(bytes, "0".repeat(64))).rejects.toThrow(
        "SHA-256 mismatch"
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("fetches without credentials and refuses mismatched bytes rather than choosing another model", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const fetcher = vi.fn(
      async () => new Response("wrong model", { status: 200 })
    );
    vi.stubGlobal("fetch", fetcher);
    try {
      await expect(loadGestureModel(GESTURE_MODELS.prototype)).rejects.toThrow(
        "SHA-256 mismatch"
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith(GESTURE_MODELS.prototype.url, {
        credentials: "omit",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
