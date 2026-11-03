import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  bookReducer,
  chapters,
  chapterProgress,
  isComplete,
  type BookState,
} from "../client/src/components/book/chapters";
import { readBook, saveBook } from "../client/src/components/book/persistence";
import { bendPage } from "../client/src/components/book/pageGeometry";
const initial: BookState = {
  phase: "contents",
  chapter: 0,
  destination: "reveal",
  serial: 0,
};
const missions = chapters.map((c, i) => ({
  id: i + 20,
  slug: c.missionSlug,
  title: c.name,
}));
afterEach(() => vi.unstubAllGlobals());
describe("Travel book progression", () => {
  it("preserves the seven existing mission bindings and order", () => {
    expect(chapters.map(c => c.missionSlug)).toEqual([
      "water-detective",
      "energy-smart-check",
      "waste-sort-study",
      "micro-habitat-observer",
      "climate-evidence-basics",
      "design-a-better-route",
      "one-week-impact-choice",
    ]);
    expect(new Set(chapters.map(c => c.id)).size).toBe(7);
  });
  it("only awards stamps for server verified/completed missions, never submissions", () => {
    const progress = chapterProgress(missions, [
      { missionId: 20, status: "verified" },
      { missionId: 21, status: "submitted" },
      { missionId: 22, status: "in_progress" },
    ]);
    expect(progress).toMatchObject({ count: 1, frontier: 1 });
    expect(progress.completed).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    for (const status of [
      "submitted",
      "verification_required",
      "rejected",
      "revision_requested",
    ])
      expect(isComplete(status)).toBe(false);
  });
  it("does not infer completion from an unpublished/unknown mission", () => {
    expect(
      chapterProgress([], [{ missionId: 20, status: "completed" }]).count
    ).toBe(0);
  });
  it("rejects locked and malformed navigation and double transitions", () => {
    for (const index of [1, 7, -1, NaN, 1.5])
      expect(bookReducer(initial, { type: "SELECT", index, frontier: 0 })).toBe(
        initial
      );
    const turning = bookReducer(initial, {
      type: "SELECT",
      index: 0,
      frontier: 0,
    });
    expect(turning.phase).toBe("turning");
    expect(
      bookReducer(turning, { type: "SELECT", index: 0, frontier: 0 })
    ).toBe(turning);
    expect(bookReducer(turning, { type: "ANIMATED" }).phase).toBe("reveal");
  });
  it("supports completed revisits and all seven stamps without changing completion", () => {
    expect(
      bookReducer(initial, {
        type: "SELECT",
        index: 5,
        frontier: 0,
        completed: true,
      }).chapter
    ).toBe(5);
    expect(
      chapterProgress(
        missions,
        missions.map(m => ({ missionId: m.id, status: "completed" }))
      )
    ).toMatchObject({ frontier: 6, count: 7 });
  });
  it("ignores stale animation callbacks after navigation has settled", () => {
    const ready = { ...initial, phase: "ready" as const };
    expect(bookReducer(ready, { type: "ANIMATED" })).toBe(ready);
    expect(bookReducer(ready, { type: "REVEALED" })).toBe(ready);
  });
});
describe("Presentation migration", () => {
  it("migrates location only and preserves educational state and other profiles", () => {
    const data = new Map([
      ["uaeTrainJourney:v1:42", JSON.stringify({ boarded: true, station: 4 })],
      ["mission-progress", "verified"],
      ["uaeTrainJourney:v1:43", '{"station":2}'],
    ]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    });
    expect(readBook("42")).toEqual({ chapter: 4, seenStamps: [] });
    saveBook("42", 4, ["abu-dhabi"]);
    expect(readBook("42")).toEqual({ chapter: 4, seenStamps: ["abu-dhabi"] });
    expect(data.get("mission-progress")).toBe("verified");
    expect(data.has("uaeTrainJourney:v1:43")).toBe(true);
    expect(data.has("uaeTrainJourney:v1:42")).toBe(false);
  });
  it("keeps navigation usable when storage is denied or corrupt", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(readBook("guest")).toEqual({ chapter: 0, seenStamps: [] });
    expect(() => saveBook("guest", 0, [])).not.toThrow();
  });
});
describe("Flexible page geometry", () => {
  it("anchors the spine, bends the fore-edge and settles flat on both sides", () => {
    const geometry = new THREE.PlaneGeometry(5.2, 3.7, 32, 12);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      bendPage(geometry, t);
      const p = geometry.attributes.position;
      expect(p.getX(0)).toBeCloseTo(0);
      expect(p.getY(0)).toBeCloseTo(0.37);
      for (let i = 0; i < p.count; i++)
        for (const value of [p.getX(i), p.getY(i), p.getZ(i)])
          expect(Number.isFinite(value)).toBe(true);
      if (t === 0.5) expect(p.getY(32)).toBeGreaterThan(2);
      if (t === 1) {
        expect(p.getX(32)).toBeCloseTo(-5.2);
        expect(p.getY(32)).toBeCloseTo(0.37);
      }
    }
    geometry.dispose();
  });
});
