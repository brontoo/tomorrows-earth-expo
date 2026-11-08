import { useEffect, useState } from "react";
import type { FrameManifest } from "./contracts";
import { loadFrameImage, validateFrameManifest } from "./manifest";
import { resolveAssetLocation } from "./assetLocation";

export function useFrameManifest(
  enabled: boolean,
  configuredBase: string | undefined,
  version?: string
) {
  const [result, setResult] = useState<{
    manifest: FrameManifest | null;
    baseUrl: string;
    error: string | null;
  }>({ manifest: null, baseUrl: "", error: null });
  useEffect(() => {
    if (!enabled || !configuredBase) return;
    const abort = new AbortController();
    let timedOut = false;
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
      const response = await fetch(manifestUrl, {
        signal: abort.signal,
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error(`Manifest request failed (${response.status})`);
      const manifest = validateFrameManifest(await response.json());
      if (version && manifest.mediaVersion !== version)
        throw new Error("Manifest media version mismatch");
      const initial = await loadFrameImage(manifest, 0, baseUrl, abort.signal);
      initial.close();
      if (!abort.signal.aborted) setResult({ manifest, baseUrl, error: null });
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
    };
  }, [enabled, configuredBase, version]);
  return result;
}
