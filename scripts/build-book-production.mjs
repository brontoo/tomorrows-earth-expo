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
const libraryVersion = process.env.VITE_LIBRARY_MEDIA_VERSION?.trim();
const libraryManifestSha = process.env.VITE_LIBRARY_MANIFEST_SHA256?.trim();
if (
  (libraryVersion || libraryManifestSha) &&
  (!/^library-[a-f0-9]{16}$/.test(libraryVersion ?? "") ||
    !/^[a-f0-9]{64}$/.test(libraryManifestSha ?? ""))
)
  throw Error(
    "Configure both the immutable library version and manifest SHA-256"
  );
// Task 17 verified every object in this public Supabase release.
const publishedLibrary = {
  mediaVersion: "library-83e47f63f8ba623f",
  manifestSha256:
    "50c3e7391eafffbff908d1bbe9b91c9ccbe7b43d1685e2049f87c51e5efa10aa",
};
const production =
  !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
const library =
  libraryVersion && libraryManifestSha
    ? { mediaVersion: libraryVersion, manifestSha256: libraryManifestSha }
    : production
      ? publishedLibrary
      : null;
const libraryFlags = library
  ? {
      VITE_LIBRARY_MEDIA_VERSION: library.mediaVersion,
      VITE_LIBRARY_MANIFEST_SHA256: library.manifestSha256,
    }
  : {};
console.log(`Library release: ${library?.mediaVersion ?? "disabled"}`);
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js"), "build"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...flags, ...libraryFlags, NODE_ENV: "production" },
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
      library,
      model: "B",
      modelSha256:
        "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
      frameRange: { startInclusive: 0, endExclusive: 1673 },
    },
    null,
    2
  ) + "\n"
);
