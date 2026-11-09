import { describe, expect, it } from "vitest";
import {
  frameBookMediaConfig,
  ORIGINAL_BOOK_MEDIA,
} from "../client/src/components/book/frames/frameBookMediaConfig";
import { resolveAssetLocation } from "../client/src/components/book/frames/assetLocation";

describe("Final continuous route media configuration", () => {
  it.each([
    {},
    { VITE_BOOK_ASSET_BASE_URL: "", VITE_BOOK_MEDIA_VERSION: "  " },
  ])(
    "uses the original immutable media when build settings are missing: %j",
    env => {
      expect(frameBookMediaConfig(env)).toEqual({
        baseUrl: ORIGINAL_BOOK_MEDIA.baseUrl,
        version: ORIGINAL_BOOK_MEDIA.version,
      });
    }
  );
  it("retains an explicitly configured media source and version", () => {
    expect(
      frameBookMediaConfig({
        VITE_BOOK_ASSET_BASE_URL: "https://media.example.test/book/",
        VITE_BOOK_MEDIA_VERSION: "release-2",
      })
    ).toEqual({
      baseUrl: "https://media.example.test/book/",
      version: "release-2",
    });
  });
  it.each(["", "/"])(
    "does not append the media version twice for an earlier versioned base %s",
    slash => {
      const base =
        ORIGINAL_BOOK_MEDIA.baseUrl + ORIGINAL_BOOK_MEDIA.version + slash;
      const config = frameBookMediaConfig({ VITE_BOOK_ASSET_BASE_URL: base });
      const resolved = resolveAssetLocation(
        config.baseUrl,
        "https://example.test",
        config.version
      );
      expect(resolved.manifestUrl).toBe(
        ORIGINAL_BOOK_MEDIA.baseUrl +
          ORIGINAL_BOOK_MEDIA.version +
          "/manifest.json"
      );
    }
  );
});
