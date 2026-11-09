/** Opt-in, bounded, local timing data only. No video, landmarks, credentials or uploads. */
export class FrameDiagnostics {
  private samples = new Map<string, Record<string, unknown>[]>();
  private counts: Record<string, number> = {};
  record(kind: string, sample: Record<string, unknown> = {}) {
    this.counts[kind] = (this.counts[kind] ?? 0) + 1;
    const rows = this.samples.get(kind) ?? [];
    if (rows.length === 512) rows.shift();
    rows.push({ recordedAt: performance.now(), ...sample });
    this.samples.set(kind, rows);
  }
  snapshot() {
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    return {
      counts: { ...this.counts },
      samples: Object.fromEntries(
        Array.from(this.samples, ([k, v]) => [k, [...v]])
      ),
      sampleLimitPerKind: 512,
      memory: memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          }
        : null,
      memoryScope:
        "JS heap only when supported; decoded bitmap budgets reported separately",
    };
  }
}
let instance: FrameDiagnostics | null | undefined;
let observer: PerformanceObserver | null = null;
export function startBookDiagnostics() {
  if (instance === null) instance = undefined;
  bookDiagnostics();
}
export function stopBookDiagnostics() {
  observer?.disconnect();
  observer = null;
  instance = null;
  if (typeof window !== "undefined")
    window.removeEventListener("pagehide", stopBookDiagnostics);
}
export function bookDiagnostics() {
  if (instance !== undefined) return instance;
  if (
    typeof window === "undefined" ||
    !new URLSearchParams(window.location.search).has("bookDiagnostics")
  )
    return (instance = null);
  instance = new FrameDiagnostics();
  const target = window as Window & {
    __sevenEmiratesDiagnostics?: FrameDiagnostics;
  };
  target.__sevenEmiratesDiagnostics = instance;
  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes("longtask")
  ) {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries())
        instance?.record("longTask", {
          duration: entry.duration,
          startTime: entry.startTime,
        });
    });
    observer.observe({ type: "longtask", buffered: true });
    window.addEventListener("pagehide", stopBookDiagnostics, { once: true });
  }
  return instance;
}
