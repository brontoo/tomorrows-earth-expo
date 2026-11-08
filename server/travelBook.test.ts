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

describe("Educational integration contract", () => {
  it("keeps exact chapter identifiers, order and existing mission URLs", () => {
    expect(
      chapters.map(({ id, order, missionSlug, route }) => [
        id,
        order,
        missionSlug,
        route,
      ])
    ).toEqual([
      ["abu-dhabi", 1, "water-detective", "/missions/water-detective"],
      ["dubai", 2, "energy-smart-check", "/missions/energy-smart-check"],
      ["sharjah", 3, "waste-sort-study", "/missions/waste-sort-study"],
      [
        "ajman",
        4,
        "micro-habitat-observer",
        "/missions/micro-habitat-observer",
      ],
      [
        "umm-al-quwain",
        5,
        "climate-evidence-basics",
        "/missions/climate-evidence-basics",
      ],
      [
        "ras-al-khaimah",
        6,
        "design-a-better-route",
        "/missions/design-a-better-route",
      ],
      [
        "fujairah",
        7,
        "one-week-impact-choice",
        "/missions/one-week-impact-choice",
      ],
    ]);
  });

  it.each([
    "in_progress",
    "submitted",
    "verification_required",
    "rejected",
    "revision_requested",
    "pending",
    "unknown",
  ])("%s never earns a stamp or advances the frontier", status => {
    const progress = chapterProgress(missions, [
      { missionId: missions[0].id, status },
    ]);
    expect(progress.count).toBe(0);
    expect(progress.frontier).toBe(0);
    expect(progress.completed).toEqual(Array(7).fill(false));
    expect(
      bookReducer(initial, {
        type: "SELECT",
        index: 1,
        frontier: progress.frontier,
      })
    ).toBe(initial);
  });

  it.each(["completed", "verified"])(
    "%s unlocks exactly the next sequential chapter",
    status => {
      for (let count = 0; count <= 7; count++) {
        const progress = chapterProgress(
          missions,
          missions.slice(0, count).map(m => ({ missionId: m.id, status }))
        );
        expect(progress.count).toBe(count);
        expect(progress.frontier).toBe(Math.min(count, 6));
        for (let index = 0; index < 7; index++) {
          const next = bookReducer(initial, {
            type: "SELECT",
            index,
            frontier: progress.frontier,
            completed: progress.completed[index],
          });
          if (index <= progress.frontier) expect(next.chapter).toBe(index);
          else expect(next).toBe(initial);
        }
      }
    }
  );

  it("allows an already completed chapter to reopen without unlocking intervening gaps", () => {
    const progress = chapterProgress(missions, [
      { missionId: missions[5].id, status: "verified" },
    ]);
    expect(progress.frontier).toBe(0);
    expect(
      bookReducer(initial, {
        type: "SELECT",
        index: 5,
        frontier: progress.frontier,
        completed: progress.completed[5],
      }).chapter
    ).toBe(5);
    expect(
      bookReducer(initial, {
        type: "SELECT",
        index: 4,
        frontier: progress.frontier,
        completed: progress.completed[4],
      })
    ).toBe(initial);
  });

  it("presentation events cannot create server-derived stamps", () => {
    const states = [{ missionId: missions[0].id, status: "submitted" }];
    const before = chapterProgress(missions, states);
    let state = bookReducer({ ...initial, phase: "cover" }, { type: "OPEN" });
    state = bookReducer(state, { type: "ANIMATED" });
    state = bookReducer(state, { type: "SELECT", index: 0, frontier: 0 });
    for (const event of ["ANIMATED", "REVEALED", "STAMP", "STAMPED"] as const) {
      state = bookReducer(state, { type: event });
      expect(chapterProgress(missions, states)).toEqual(before);
    }
    expect(before.count).toBe(0);
    expect(states).toEqual([
      { missionId: missions[0].id, status: "submitted" },
    ]);
  });

  it("never treats stale IDs or missing catalogue entries as completed chapters", () => {
    const states = missions.map(m => ({ missionId: m.id, status: "verified" }));
    expect(chapterProgress([], states)).toMatchObject({
      count: 0,
      frontier: 0,
    });
    const progress = chapterProgress(missions.slice(1), states);
    expect(progress.completed[0]).toBe(false);
    expect(progress.frontier).toBe(0);
    expect(
      chapterProgress(missions, [{ missionId: 99999, status: "completed" }])
        .count
    ).toBe(0);
  });
});

describe("Profile-specific book restoration", () => {
  function storage(data = new Map<string, string>()) {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
    return data;
  }

  it("restores independent chapter positions and seen animations for each profile", () => {
    storage();
    saveBook("student-a", 4, ["abu-dhabi"]);
    saveBook("student-b", 1, ["dubai"]);
    expect(readBook("student-a")).toEqual({
      chapter: 4,
      seenStamps: ["abu-dhabi"],
    });
    expect(readBook("student-b")).toEqual({
      chapter: 1,
      seenStamps: ["dubai"],
    });
    expect(readBook("guest")).toEqual({ chapter: 0, seenStamps: [] });
    saveBook("student-a", 2, []);
    expect(readBook("student-b").chapter).toBe(1);
  });

  it("restored positions and forged seen stamps never confer educational completion", () => {
    storage();
    saveBook(
      "student",
      6,
      chapters.map(c => c.id)
    );
    const saved = readBook("student");
    const progress = chapterProgress(missions, []);
    expect(progress.count).toBe(0);
    expect(
      bookReducer(initial, {
        type: "SELECT",
        index: saved.chapter,
        frontier: progress.frontier,
        completed: progress.completed[saved.chapter],
      })
    ).toBe(initial);
  });

  it("clamps saved out-of-range chapters and discards invalid stamp entries", () => {
    const data = storage();
    data.set(
      "sevenEmiratesBook:v1:test",
      JSON.stringify({ chapter: 100, seenStamps: ["dubai", 123, null] })
    );
    expect(readBook("test")).toEqual({ chapter: 6, seenStamps: ["dubai"] });
    data.set("sevenEmiratesBook:v1:test", JSON.stringify({ chapter: -2 }));
    expect(readBook("test").chapter).toBe(0);
    data.set("sevenEmiratesBook:v1:test", "{corrupt");
    expect(readBook("test")).toEqual({ chapter: 0, seenStamps: [] });
  });
});
