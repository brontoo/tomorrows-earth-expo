import { describe, expect, it } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  bookReducer,
  chapterProgress,
  chapters,
  type BookState,
} from "../client/src/components/book/chapters";
import { explorationRanges } from "../client/src/components/book/frames/exploration";
import { restrictFrame } from "../client/src/components/book/frames/manifest";
import { BookGestureController } from "../client/src/components/book/gestures/BookGestureController";

const manifest = JSON.parse(
  readFileSync("media/seven-emirates/manifest.json", "utf8")
);
const initial: BookState = {
  phase: "contents",
  chapter: 0,
  destination: "reveal",
  serial: 0,
};
describe("Universal exploration, independent of educational records", () => {
  it.each(["guest", "student", "teacher", "offline"])(
    "opens all seven chapters with zero progress for %s",
    () => {
      expect(chapterProgress([], []).count).toBe(0);
      for (let index = 0; index < 7; index++)
        expect(bookReducer(initial, { type: "SELECT", index }).chapter).toBe(
          index
        );
    }
  );
  it("covers every integer frame and all six boundaries in both directions without a mission frontier", () => {
    const ranges = explorationRanges(manifest);
    expect(ranges).toEqual([{ startInclusive: 0, endExclusive: 1673 }]);
    for (let index = 0; index < 1673; index++)
      expect(restrictFrame(index, 0, ranges)).toBe(index);
    for (const chapter of manifest.chapters.slice(1)) {
      expect(
        restrictFrame(
          chapter.startInclusive,
          chapter.startInclusive - 1,
          ranges
        )
      ).toBe(chapter.startInclusive);
      expect(
        restrictFrame(
          chapter.startInclusive - 1,
          chapter.startInclusive,
          ranges
        )
      ).toBe(chapter.startInclusive - 1);
    }
  });
  it("gesture seeks use the entire book and never change mission statuses or achievements", () => {
    const missions = chapters.map((c, i) => ({
      id: i + 1,
      slug: c.missionSlug,
      title: c.name,
    }));
    const statuses = missions.map(m => ({
      missionId: m.id,
      status: "submitted",
    }));
    const before = structuredClone(statuses);
    let frame = 238;
    const ranges = explorationRanges(manifest);
    const input = {
      frameCount: 1673,
      getFrame: () => frame,
      isAvailable: () => true,
      seekTo: (next: number) => {
        frame = restrictFrame(next, frame, ranges);
      },
    };
    const c = new BookGestureController();
    const pose = (x: number) => ({
      landmarks: [Array.from({ length: 21 }, () => ({ x, y: 0.5 }))],
      gestures: [[{ categoryName: "Closed_Fist", score: 0.95 }]],
    });
    const scope = { left: 0, top: 0, width: 1000, height: 700 };
    for (const chapter of manifest.chapters.slice(1)) {
      const edge = chapter.startInclusive;
      frame = edge - 1;
      c.reset();
      c.process(pose(0.5), 0, input, scope, false, () => false);
      c.process(pose(0.5), 140, input, scope, false, () => false);
      for (let t = 210; t < 900; t += 70)
        c.process(pose(1), t, input, scope, false, () => false);
      expect(frame).toBeGreaterThanOrEqual(edge);
      frame = edge;
      c.reset();
      c.process(pose(0.5), 0, input, scope, false, () => false);
      c.process(pose(0.5), 140, input, scope, false, () => false);
      for (let t = 210; t < 900; t += 70)
        c.process(pose(0), t, input, scope, false, () => false);
      expect(frame).toBeLessThan(edge);
    }
    expect(statuses).toEqual(before);
    expect(chapterProgress(missions, statuses).count).toBe(0);
  });
  it("keeps authoritative manifest LF bytes on a Windows-style autocrlf checkout", () => {
    const raw = readFileSync("media/seven-emirates/manifest.json");
    const sha = createHash("sha256").update(raw).digest("hex");
    expect(sha).toBe(
      "96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f"
    );
    const root = mkdtempSync(join(tmpdir(), "book-lf-"));
    try {
      execFileSync("git", ["init", "-q", root]);
      mkdirSync(join(root, "media/seven-emirates"), { recursive: true });
      writeFileSync(
        join(root, ".gitattributes"),
        readFileSync(".gitattributes")
      );
      writeFileSync(join(root, "media/seven-emirates/manifest.json"), raw);
      execFileSync("git", [
        "-C",
        root,
        "-c",
        "core.autocrlf=true",
        "add",
        ".gitattributes",
        "media/seven-emirates/manifest.json",
      ]);
      execFileSync("git", [
        "-C",
        root,
        "-c",
        "core.autocrlf=true",
        "checkout-index",
        "--all",
        "--force",
        "--prefix=" + join(root, "checkout") + "/",
      ]);
      expect(
        createHash("sha256")
          .update(
            readFileSync(
              join(root, "checkout/media/seven-emirates/manifest.json")
            )
          )
          .digest("hex")
      ).toBe(sha);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
