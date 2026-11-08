import { useEffect, useState } from "react";
import type { FrameManifest } from "./contracts";
import { loadFrameImage, validateFrameManifest } from "./manifest";

export function useFrameManifest(
  enabled: boolean,
  configuredBase: string | undefined
) {
  const [result, setResult] = useState<{
    manifest: FrameManifest | null;
    baseUrl: string;
    error: string | null;
  }>({ manifest: null, baseUrl: "", error: null });
  useEffect(() => {
    if (!enabled || !configuredBase) return;
    const abort = new AbortController();
    const run = async () => {
      const baseUrl = new URL(
        configuredBase.endsWith("/") ? configuredBase : configuredBase + "/",
        window.location.origin
      ).href;
      if (!/^https?:/.test(baseUrl))
        throw new Error("Frame assets require HTTP(S)");
      const response = await fetch(new URL("manifest.json", baseUrl), {
        signal: abort.signal,
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error(`Manifest request failed (${response.status})`);
      const manifest = validateFrameManifest(await response.json());
      const initial = await loadFrameImage(manifest, 0, baseUrl, abort.signal);
      initial.close();
      if (!abort.signal.aborted) setResult({ manifest, baseUrl, error: null });
    };
    void run().catch(error => {
      if (!abort.signal.aborted)
        setResult({
          manifest: null,
          baseUrl: "",
          error:
            error instanceof Error ? error.message : "Frame media unavailable",
        });
    });
    return () => abort.abort();
  }, [enabled, configuredBase]);
  return result;
}
