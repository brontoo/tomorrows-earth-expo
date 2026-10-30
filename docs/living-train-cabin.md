# The Living Train Cabin

## Repository audit and integration choices

The application is React 19 + Vite, routed by Wouter. `/eco-journey` is a standalone game screen; `/missions/:id` renders the existing mission detail and evidence workflow. GSAP, Three.js and browser Web Audio were already present. No runtime dependency was added.

The original `EcoJourney` combined the opening/story and a large imperative SVG map. It read `missions.getAll`, selected seven missions in catalogue order, and read completion/verification from `passport.getMine`. Its old fallback mission names were not the published learning content. The new shell replaces that obsolete map presentation, while retaining the opening artwork, character model, story personality, Emirate silhouettes, mission routes, evidence submission, scoring, teacher verification, points and badges. The eighth published innovation mission remains available through the existing mission board.

There are no local mini-game answers or scores to migrate: missions are server-backed practical activities. `submitted` and `verification_required` are pending review, not completion. Only `completed` and `verified` earn a station stamp. No train API grants rewards or changes backend records.

## Architecture

- `client/src/components/game/EcoJourney.tsx`: recognizable field-journal opening, the existing 3D mascot, a short English story, gesture-based audio unlocking and boarding. Returning visitors with a saved ticket resume the cabin. The previous imperative map is replaced by the route strip.
- `train/journeyScenes.ts`: all 29 original image filenames, classifications, labels, Emirate associations, movement metadata, transition choices and canonical station/mission bindings. Abu Dhabi uses the existing Water Detective mission. The seven bindings match the first seven themes in the repository's seed data and no longer depend on a query's incidental array position.
- `train/TrainJourneyEngine.ts`: DOM-free state machine for boarding, acceleration, cruise, braking, arrival, covered reset and station idle. Preview and normal travel share the engine with different peak velocities. A smoothstep velocity curve has an analytical distance integral and acceleration derivative; fixed spring substeps drive the coffee response. There are no scene-switch timers.
- `train/SceneryRenderer.ts`: bounded image decoding, lookahead loading and Canvas exterior composition. Normal scenes move left with an occluding bridge pier at panorama seams. Tunnels, a passing train and one coastal haze segment cover the full window at content switches. The final Fujairah hold precedes a covered reset, without backwards scenery playback. Remaining assets are fetched one at a time in browser idle periods without decoding the complete set.
- `train/TrainAudio.ts`: continuous procedural filtered rumble, wheel texture and wind, distance-triggered paired rail contacts, acceleration-aware friction, departure cue and arrival chime. It shares the existing journal AudioContext, respects its persisted mute preference, and disconnects/stops its own nodes on navigation. There is no copied sample bank or soundtrack. A future owned music track can be mixed through this class's master bus; no track was supplied.
- `train/LivingTrainCabin.tsx`: server catalogue/passport adapter, Canvas animation lifecycle, restrained cabin bob, coffee surface highlight, guide card, travel ticket, keyboard controls, image retry state and development-only read-only diagnostics (`?trainDebug=1`). Per-frame state stays outside React; React updates on scene/state boundaries. The mutable engine advances only when its required images are decoded.
- `train/persistence.ts`: guarded device preview flag and profile-scoped ticket containing only the last visited station and boarding state. Passport completion is always server-authoritative. Private mode/storage failure does not block the journey. Replay returns to the previously selected earned station rather than overwriting progress.
- `MissionDetail.tsx`: keeps its existing start/submit mutations and evidence fields, invalidates the passport when they succeed, and provides a clear return-to-train link. Teacher-approved completion is refreshed when the cabin mounts, regains focus, or polls.

## Assets and mask

The supplied archive contains 29 JPEG landscapes at 1376 × 768 and `main fram.jpg` at 2752 × 1536. All original filenames and JPEG bytes are retained under `client/public/train/`.

The frame is an opaque JPEG with a white placeholder, rather than a transparent PNG. `scripts/generate-train-masks.py` traces only the connected near-white window area from its centre and writes complementary alpha masks, preserving curtains, tassels, lamps and other foreground details. The measured opening bounds are `(469, 99)` to `(2296, 1250)` in source coordinates. Both masks, the Canvas, glass and original foreground share one aspect-ratio-locked artboard and the same restrained vertical transform. They cannot drift apart at different viewport sizes. The original foreground never pans sideways.

The cup remains in the original illustration. A small, clipped-looking elliptical surface highlight at the measured coffee location follows a damped acceleration response; the cup itself does not wobble or become detached from the table. This is intentionally conservative for flattened artwork.

Visual inventory follows archive numbering rather than guessed transition filenames. Scenes 24, 26 and 28 depict repeated desert artwork, despite filenames suggesting other transitions; they are preserved as supplied. Scene 29 depicts Fujairah's fort, mountains and a glimpse of the eastern sea, rather than an invented replacement coast. No scene is treated as a separate station solely because it is a landmark.

## Accessibility and lifecycle

All new UI, labels, statuses and accessibility text are English. The sole Arabic-script UI name is exactly `بوغصن`. No language switching, translation files or RTL implementation was added. The old separately loaded Arabic font was removed from the opening's font request; the name uses the system fallback.

Reduced motion eliminates lateral scrolling, cabin bob and coffee response, shortens travel and uses restrained covered changes. Pause and document visibility stop the shared clock; hidden time is never caught up on return. Unmount cancels animation frames, idle prefetch, resize/visibility listeners and audio sources. Opening parallax, star-canvas listeners and Three.js resources now also clean up. AudioContext creation is gated by user activation, including the existing journal sound helpers.

Controls use semantic buttons/links, visible keyboard focus and explicit status names. Locked stations remain visible. The route strip scrolls horizontally on small screens without making the page itself overflow. Images preserve aspect ratio at desktop, tablet and mobile sizes.

## Reference and licensing

Engineering reference: [sevenevesai/riso-windowseat](https://github.com/sevenevesai/riso-windowseat), inspected at commit `765630967e495c3fce8a5e3ce2175bb8069c79da`.

Reviewed `films/window-seat/index.html`, `FILM.md`, `AUDIO-SOURCES.md`, the root MIT `LICENSE`/`THIRD_PARTY_NOTICES.md`, sound studies and supporting tools. Useful principles were analytical integrated speed, acceleration-driven secondary response, restrained distance-based rail contacts, continuous carriage ambience, full-window occlusion and settling after stops. The 78-second film timeline, rendering system, scene geometry, score, audio samples and visual assets were not copied. The implementation is original and state-driven for this application.

Window Seat's Salamander Grand Piano recordings by Alexander Holm have separate CC BY 3.0 terms. None are included here. Any future reuse of that bank requires its source/transformation attribution, and substantial reuse of MIT code requires retention of its copyright/license notice.

## Run and verify

Use the existing checkout; no worktree is needed. The cloud environment's tested startup remains `bash /workspace/tee-environment/start.sh`. Alternatively, from the repository with a reachable development database:

```bash
export COREPACK_HOME=/workspace/.cache/corepack
export DATABASE_URL=postgresql://postgres@127.0.0.1:5432/tee_development
NODE_ENV=development corepack pnpm dev
```

Open the existing `/eco-journey` route in your development browser. The current local database has no published mission seed data. The cabin reports that state instead of fabricating challenges; populate the repository's existing catalogue in a dedicated development database to use live missions. Real Supabase sign-in/uploads still need the existing project's configuration. The train does not alter or provision external accounts.

Commands:

```bash
corepack pnpm build
corepack pnpm check
corepack pnpm test --maxWorkers=2 --minWorkers=1
corepack pnpm exec vitest run server/trainJourney.test.ts --maxWorkers=2 --minWorkers=1
python scripts/qa-train.py
```

The Python browser QA requires Playwright and Chromium (already available in this cloud instance). It reads the existing seed's learning copy, supplies explicit API fixtures for authentication, evidence submission and teacher verification, and uses real application routes, assets, animation and audio. It never modifies student data or pretends fixtures establish live remote authentication. Screenshots and a JSON report are written to `/tmp/tee-train-qa/`.

### Validation results

Executed in the cloud instance:

- Production frontend build: passed. Existing large-chunk warnings remain; no runtime dependency was added.
- New deterministic engine suite: 10/10 passed.
- Complete server suite against local PostgreSQL: 56 passed, 3 failed, 59 total in 7 files. The same three baseline failures remain: two submission tests assume the May 2026 deadline is open, and one teacher fixture lacks reviewer approval. None were skipped or disabled.
- Type checking: six pre-existing diagnostics remain, with no train diagnostics: undeclared `@mediapipe/tasks-vision`, `votes` versus `voteCount`, missing `ecoGuide` router plus its implicit-any callback, nullable `openId`, and the seed script transaction callback type. No lint script is defined in `package.json`.
- Chromium browser suite: 15 checks passed, including the uninterrupted 29-scene preview, Fujairah hold/reset, keyboard skip/replay, pause/visibility, refresh, existing mission submission, pending-review lock, verified stamp/departure to Dubai, final arrival, back/forward, reduced motion and four viewport sizes. No uncaught browser errors were recorded. Mission/authentication/teacher states in this suite are explicit fixtures, not live external credentials.
- Focused audio lifecycle check: a returning player has no AudioContext before interaction; replay creates one context and three ambience sources; all three sources stop on navigation.
- The original 30 JPEGs match the archive byte-for-byte. Complementary alpha masks were checked at window, wall, curtain, table and lamp samples.
- Active-travel frame cadence in headless Chromium: 60.0 average FPS and 16.7 ms p95 frame interval in separate three-second samples at 1440 × 900 and 390 × 844. These viewport tests are not measurements on physical mobile devices. Stationary Canvas painting is suppressed after the suspension settles.
- A TypeScript AST scan of frontend strings/JSX found only the exact permitted character name as Arabic-script UI; comments are not application UI. No RTL or translation feature was introduced.
- `git diff --check`: passed. Dependency manifests, lockfiles, schemas, backend routers and learning content are unchanged.

Screenshots, the 15-check JSON report and frame-cadence samples are available under `/tmp/tee-train-qa/` in this instance. No fresh cloud snapshot publication was performed. Physical devices and Safari/Firefox were not tested. Live end-to-end student authentication and teacher approval remain dependent on the project's existing Supabase configuration and populated mission database.

The exact changed-file inventory is in [living-train-changes.md](living-train-changes.md).
