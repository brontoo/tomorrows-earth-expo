/** Existing Vercel production build: preserve platform env, pin public book flags. */
import { spawnSync, execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flags = {
  VITE_BOOK_ENGINE: "frames",
  VITE_BOOK_GESTURES: "true",
  VITE_BOOK_MODEL_AB: "false",
  VITE_BOOK_ASSET_BASE_URL:
    "https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/",
  VITE_BOOK_MEDIA_VERSION: "7e-1bc718ef5e77",
};
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js"), "build"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...flags, NODE_ENV: "production" },
  }
);
if (result.status !== 0) process.exit(result.status ?? 1);

// Public provenance only. Never serialize the environment or platform credentials.
const commit =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
if (!/^[a-f0-9]{40}$/i.test(commit))
  throw Error("A valid source commit is required for production provenance");
writeFileSync(
  path.join(root, "dist/seven-emirates-release.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      commit,
      publicBookFlags: flags,
      model: "B",
      modelSha256:
        "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
      frameRange: { startInclusive: 0, endExclusive: 1673 },
    },
    null,
    2
  ) + "\n"
);
