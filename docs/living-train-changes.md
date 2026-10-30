# Exact changed-file inventory

This is the initial implementation inventory. See [living-train-refinement.md](living-train-refinement.md#exact-files-in-this-refinement) for the subsequent focused refinement.

No dependency manifest, lockfile, backend router, database schema or mission learning content was changed.

| File | Purpose |
| --- | --- |
| `client/public/train/01-TRANSITION 00.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/02- AD1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/03- TRANSITION 01.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/04- AD2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/05- TRANSITION 02A.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/06- .jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/07- D1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/08- TRANSITION 03.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/09- D2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/10- TRANSITION 04.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/11- SHJ1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/12- TRANSITION 05.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/13- SHJ2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/14- TRANSITION 06.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/15- AJ1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/16- TRANSITION 07.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/17- AJ2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/18- TRANSITION 08.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/19- UMQ1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/20- TRANSITION 09.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/21- UMQ2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/22- TRANSITION 02A - Copy.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/23- RAK1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/24- TRANSITION 02A - Copy - Copy - Copy.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/25- RAK2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/26- TRANSITION 02A - Copy.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/27- FUJ1.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/28- TRANSITION 02A - Copy.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/29- FUJ2.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/cabin-mask.png` | Derived alpha mask; original artwork is unchanged. |
| `client/public/train/main fram.jpg` | Original user-supplied artwork, retained byte-for-byte under its original filename. |
| `client/public/train/window-mask.png` | Derived alpha mask; original artwork is unchanged. |
| `client/src/components/game/EcoJourney.tsx` | Preserve the opening and story; replace the obsolete map phase with train boarding and returning-player resume. |
| `client/src/components/game/animations.ts` | Return cleanup functions for opening parallax and resize listeners. |
| `client/src/components/game/fieldJournal.css` | Remove the separately requested Arabic font from the opening font download. |
| `client/src/components/game/threeScene.ts` | Dispose opening model resources and reject late model loads after unmount. |
| `client/src/components/game/train/LivingTrainCabin.tsx` | Cabin, route HUD, real mission/passport adapter and animation lifecycle. |
| `client/src/components/game/train/SceneryRenderer.ts` | Staged image decoding and clipped scenery/occlusion rendering. |
| `client/src/components/game/train/TrainAudio.ts` | Procedural, speed/distance-driven train sound using the existing context. |
| `client/src/components/game/train/TrainJourneyEngine.ts` | Reusable analytic motion/state engine and damped coffee response. |
| `client/src/components/game/train/journeyScenes.ts` | Explicit ordered scene manifest and canonical station/mission data. |
| `client/src/components/game/train/persistence.ts` | Guarded preview/profile-ticket persistence and verified-state semantics. |
| `client/src/components/game/train/train.css` | Responsive cabin, travel ticket, motion preferences and accessible controls. |
| `client/src/lib/journalMotion.ts` | Share the existing AudioContext, persist mute preference and gate context creation on user activation. |
| `client/src/pages/EcoJourneyPage.tsx` | Allow the responsive cabin/ticket layout to scroll vertically without horizontal overflow. |
| `client/src/pages/MissionDetail.tsx` | Refresh passport caches after existing mutations and add explicit return-to-train links. |
| `docs/living-train-cabin.md` | Architecture, audit, source licensing, asset findings, run instructions and validation details. |
| `scripts/generate-train-masks.py` | Reproducibly trace the supplied window opening into complementary masks. |
| `scripts/qa-train.py` | Browser integration QA with explicit server-state fixtures and real rendering/routes. |
| `server/trainJourney.test.ts` | Regression tests for deterministic travel, full scene coverage, covered reset, arrival, reduced motion and progress semantics. |
| `docs/living-train-changes.md` | This complete changed-file inventory. |
