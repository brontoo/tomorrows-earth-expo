# Abu Dhabi — The Hidden Forest

The experience opens when the Abu Dhabi chapter settles. Back to Book and Escape restore the same book canvas and final chapter frame. The direct preview route is `/eco-journey/abu-dhabi-world`. The existing seven-emirate media and manifests are reused.

## Experience and architecture

| Area | Interaction |
| --- | --- |
| Living Page | Enter from the rendered Abu Dhabi chapter and return to its settled frame. |
| Forest Canopy | Orbit the grey mangrove, magnify a leaf, reveal salt deposits, observe a bird in flight, and inspect the mud crab. |
| Beneath the Surface | Follow juvenile flathead grey mullet and compare swimming space near roots with open water. |
| Root Labyrinth | Select pencil-like pneumatophores and expose the lateral roots in a cutaway. |
| Tidal World | Move from low to high water, compare the tidal bank, and trace the creek toward the coast. |
| Carbon Vault | Follow plant uptake, litter and burial. Inspect sediment layers and compare disturbed sediment. |
| Living Atlas | Revisit illustrated discoveries and view the Abu Dhabi Legacy Seal after all twelve are collected. |

- `FrameTravelBook.tsx` opens the lazy-loaded overlay on the Abu Dhabi resting frame. The underlying book stays mounted and skips interaction while the overlay is open. Hand controls suspend while the forest is open. Re-entry makes them available through the existing user-controlled toggle.
- `AbuDhabiWorld.tsx` handles view selection, focus, the tide slider, the atlas, and sound settings. Orbit, zoom, tilt and inspect are available through keyboard-accessible controls. The scene also supports pointer and touch. Reduced motion makes camera and tide changes immediate and renders new frames on demand.
- `mangroveScene.ts` owns the single Three.js scene and animation callback, raycasting, model lifecycle, render profiles, shader and animation. The scene adapts pixel ratio after sustained slow frames. The low and far trees load first. A higher-detail tree and a decorative roots model load when their inspection actions need them. Leaving aborts pending model fetches and releases scene resources, the WebGL context, event listeners and audio.
- `forestContent.ts` holds facts, attribution and interaction labels. `forestModels.ts` contains procedural models. `forestAudio.ts` uses synthesized coastal wind and water, bird calls, transition and discovery cues, with a low-pass effect underwater. Sound is opt-in with a global toggle and separate ambience and discovery levels. Asset sources, hashes, geometry, texture dimensions and scientific status are in [asset-report.json](../client/public/worlds/abu-dhabi/asset-report.json).
- `hiddenForest.ts` in `shared/` defines the allowed observations, all discovery conditions and the seal calculation. The portal accepts individual observation IDs and derives rewards from the stored evidence. The database uses a unique index for idempotent records and a foreign key to the account. The server reads the session identity for both writes and reads. Browser-reported observations indicate exploration activity. Teachers assess scientific understanding separately.
- Guests use versioned browser storage. Students use authenticated tRPC queries and writes. Teacher reports reuse the existing approved-reviewer and supervised-project-owner scope. Reports include areas, observations and discoveries for students with records. Reflection submission is outside this implementation.

## Prototype and asset workflow

The supplied integration script was inspected and run in dry-run mode. The world was adapted to the retained-canvas book instead of using the prototype's route navigation. The prototype's three GLBs are included locally. The far tree was derived from the low GLB using Blender's Collapse decimator with ratio 0.24 and triangles retained. The vegetation and terrain use vertex colour and runtime materials. The original archive and its leaf and bark textures were absent from the supplied ZIP. The atlas, scientific cutaways and coastal habitat represent an illustrated learning environment. The uploaded decorative roots mesh appears as supplementary scenery.

The selected game-development skills and router are available in `.agents/skills`, pinned to upstream commit `c6ca6c41c839b68319ffc08430b99ab768debc32`. The Apache 2.0 license and NOTICE are alongside the router. The renderer uses the existing Three.js version `0.186.1`. [Upstream skill repository](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)

The Gallery uses the same scene canvas and camera controls to display the freshwater climbing perch and fictional scarlet plant as standalone exhibits. The gallery downloads models upon selection and carries the scarlet plant attribution. The mullet loads when students enter the underwater view. The crab loads when they enter the tidal view or inspect the crab. The bird loads after the first forest frame. Saved discovery IDs are stable across the wildlife changes.

## Scientific review

Content references accompany the individual observations and atlas entries. The scene uses schematic tides and conceptual carbon arrows. It omits measured tide predictions and carbon quantities. Grey mangrove adaptation, nursery habitat and carbon storage were authored against the linked ecological references. Regional species identification, habitat details and classroom wording still need an independent review. The crab is identified at genus level. The supplied bird has no species label. [Environment Agency – Abu Dhabi](https://www.ead.gov.ae/en/) · [Mangrove habitat review](https://doi.org/10.1016/j.aquabot.2007.12.007) · [Mangrove water balance](https://doi.org/10.1093/aob/mcu174) · [Mangrove carbon storage](https://doi.org/10.1038/ngeo1123)

## Verification and release approvals

The branch includes an [automated browser report and six screenshots](qa/hidden-forest/README.md). The production build passed. All four new focused tests passed. The full suite had 179 passes and the same three project-submission failures recorded on main. Type checking produced the same five baseline diagnostics across Admin Dashboard, EcoGuide, SDK and the seed script. Local PostgreSQL verified the migration can be applied twice, enforces unique learner/action records and valid actions, cascades user deletes, and denies direct access to anonymous and authenticated database roles.

Before release, confirm redistribution rights for the supplied models and derived far tree. Review the [additive SQL](../drizzle/manual/apply-hidden-forest.sql) and apply it on an approved staging database first. Verify authenticated reopening and teacher access using separate staging accounts. Check first entry, dragging, low and high tide, underwater movement, and return-to-book on the school laptops and tablets. The software-rendered Chromium measurements fell below the 30 and 60 FPS targets, and hardware performance is unverified. Production rollout and database migration require explicit approval.
