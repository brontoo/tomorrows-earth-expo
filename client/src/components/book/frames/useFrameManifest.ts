import { useEffect, useState } from "react";
import type { FrameManifest } from "./contracts";
import { loadFrameBytes, validateFrameManifest } from "./manifest";
import { resolveAssetLocation } from "./assetLocation";
import {
  framePresentation,
  validateLibraryManifest,
  type LibraryMedia,
} from "./presentation";

export function useFrameManifest(
  enabled: boolean,
  configuredBase: string | undefined,
  version?: string,
  attempt = 0,
  chapterIndex = -1,
  introConfig?: { baseUrl: string; version: string; sha256: string }
) {
  const [result, setResult] = useState<{
    manifest: FrameManifest | null;
    baseUrl: string;
    error: string | null;
    initialFrameBytes?: ArrayBuffer;
    firstFrameUrl?: string;
    intro?: LibraryMedia;
    initialFrame?: number;
  }>({ manifest: null, baseUrl: "", error: null });
  const introBase = introConfig?.baseUrl;
  const introVersion = introConfig?.version;
  const introSha = introConfig?.sha256;
  useEffect(() => {
    if (!enabled || !configuredBase) return;
    const abort = new AbortController();
    let timedOut = false;
    let firstFrameUrl: string | undefined;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, 30000);
    const run = async () => {
      const { baseUrl, manifestUrl } = resolveAssetLocation(
        configuredBase,
        window.location.origin,
        version
      );
      const fetchManifest = async (url: string) => {
        const response = await fetch(url, {
          signal: abort.signal,
          credentials: "omit",
        });
        if (!response.ok)
          throw new Error(`Manifest request failed (${response.status})`);
        return response;
      };
      const loadIntro = async () => {
        if (!introBase || !introVersion || !introSha) return undefined;
        const location = resolveAssetLocation(
          introBase,
          window.location.origin,
          introVersion
        );
        const bytes = await (
          await fetchManifest(location.manifestUrl)
        ).arrayBuffer();
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          byte => byte.toString(16).padStart(2, "0")
        ).join("");
        if (hash !== introSha)
          throw new Error("School library manifest checksum mismatch");
        return {
          baseUrl: location.baseUrl,
          manifest: validateLibraryManifest(
            JSON.parse(new TextDecoder().decode(bytes)),
            introVersion
          ),
        };
      };
      const [manifest, { intro, entrance }] = await Promise.all([
        fetchManifest(manifestUrl).then(async response =>
          validateFrameManifest(await response.json())
        ),
        loadIntro().then(async intro => ({
          intro,
          entrance:
            intro && chapterIndex < 0
              ? await loadFrameBytes(
                  intro.manifest,
                  0,
                  intro.baseUrl,
                  abort.signal
                )
              : undefined,
        })),
      ]);
      if (version && manifest.mediaVersion !== version)
        throw new Error("Manifest media version mismatch");
      const presentation = framePresentation(manifest, baseUrl, intro);
      const chapter = manifest.chapters[chapterIndex];
      const initialFrame = chapter
        ? presentation.toGlobalBookFrame(chapter.restingFrame)
        : 0;
      // A direct chapter link fetches the intro metadata only, and starts its frame window in the book.
      const initialFrameBytes =
        entrance ?? (await presentation.load(initialFrame, abort.signal, true));
      if (!abort.signal.aborted) {
        firstFrameUrl = URL.createObjectURL(new Blob([initialFrameBytes]));
        setResult({
          manifest,
          baseUrl,
          error: null,
          initialFrameBytes,
          firstFrameUrl,
          intro,
          initialFrame,
        });
      }
    };
    void run()
      .catch(error => {
        if (!abort.signal.aborted || timedOut)
          setResult({
            manifest: null,
            baseUrl: "",
            error: timedOut
              ? "Frame media initialization timed out"
              : error instanceof Error
                ? error.message
                : "Frame media unavailable",
          });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
      if (firstFrameUrl) URL.revokeObjectURL(firstFrameUrl);
    };
  }, [
    enabled,
    configuredBase,
    version,
    attempt,
    chapterIndex,
    introBase,
    introVersion,
    introSha,
  ]);
  return result;
}
