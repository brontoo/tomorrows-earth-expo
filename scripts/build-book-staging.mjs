/** Isolated frontend release candidate. Never loads repository .env or deploys. */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rollback = process.argv.includes("--legacy-rollback");
const outIndex = process.argv.indexOf("--out-dir");
const outDir = path.resolve(
  outIndex < 0
    ? path.join(tmpdir(), "seven-emirates-staging")
    : process.argv[outIndex + 1]
);
const relative = path.relative(root, outDir);
if (
  !relative.startsWith(".." + path.sep) &&
  relative !== ".." &&
  !path.isAbsolute(relative) &&
  outDir !== path.join(root, "dist-staging")
)
  throw Error("Only dist-staging is allowed inside the source checkout");
if (
  existsSync(outDir) &&
  readdirSync(outDir).length &&
  !existsSync(path.join(outDir, "book-staging-build.json"))
)
  throw Error(
    "Refusing a nonempty output directory not owned by this staging builder"
  );
if (!process.argv.includes("--worker")) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("VITE_") &&
        !key.startsWith("SUPABASE_") &&
        ![
          "DATABASE_URL",
          "JWT_SECRET",
          "GH_TOKEN",
          "GITHUB_TOKEN",
          "VERCEL_TOKEN",
        ].includes(key)
    )
  );
  Object.assign(env, {
    NODE_ENV: "production",
    VITE_BOOK_ENGINE: rollback ? "legacy" : "frames",
    VITE_BOOK_GESTURES: rollback ? "false" : "true",
    VITE_BOOK_MODEL_AB: "false",
    VITE_BOOK_ASSET_BASE_URL:
      "https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/",
    VITE_BOOK_MEDIA_VERSION: "7e-1bc718ef5e77",
  });
  // Public credentials for a genuine nonproduction auth service must be supplied explicitly.
  for (const name of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "APP_ID"])
    if (process.env["STAGING_VITE_" + name])
      env["VITE_" + name] = process.env["STAGING_VITE_" + name];
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (key) {
    let role;
    try {
      role = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString()
      ).role;
    } catch {}
    if (!key.startsWith("sb_publishable_") && role !== "anon")
      throw Error(
        "Only a nonproduction publishable/anon auth key may enter the frontend"
      );
  }
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(import.meta.url),
      "--worker",
      "--out-dir",
      outDir,
      ...(rollback ? ["--legacy-rollback"] : []),
    ],
    { cwd: root, env, stdio: "inherit" }
  );
  process.exit(result.status ?? 1);
}
const emptyEnv = mkdtempSync(path.join(tmpdir(), "book-staging-env-"));
try {
  const { build } = await import("vite");
  await build({
    configFile: path.join(root, "vite.config.ts"),
    envDir: emptyEnv,
    mode: "staging",
    build: { outDir, emptyOutDir: true },
  });
  writeFileSync(
    path.join(outDir, "book-staging-build.json"),
    JSON.stringify(
      {
        scope: "Frontend staging candidate only; not a deployed environment",
        engine: rollback ? "legacy" : "frames",
        gestures: !rollback,
        modelAB: false,
        model: "B",
        modelSha256:
          "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
        exploration: "all seven chapters; frames [0,1673)",
        authConfigured: Boolean(
          process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
        ),
      },
      null,
      2
    ) + "\n"
  );
} finally {
  rmSync(emptyEnv, { recursive: true, force: true });
}
