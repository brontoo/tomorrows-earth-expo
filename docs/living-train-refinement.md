# Living Train Cabin: focused refinement

The journey structure, seven station/mission bindings, passport unlock rules, existing routes, generated JPEGs and traced window masks remain unchanged.

## Layout

The cabin is the viewport, with only the compact ticket beneath it. The brand, sound/pause controls, station caption and preview skip live over the carriage. The former permanent guide/status/sign-in panel is now a compact station-only card inside the cabin. It can be hidden and reopened, and retains the same challenge, departure, sign-in and passport actions. Replay sits beside the ticket title.

Desktop cabin height is `100dvh - clamp(68px, 8.5dvh, 88px)`. Measured cabin/view heights:

| Viewport | Cabin section |
| --- | --- |
| 1920 × 1080 | 91.9% |
| 1600 × 900 | 91.5% |
| 1440 × 900 | 91.5% |
| 1366 × 768 | 91.1% |
| Tablet landscape 1024 × 768 | 91.1% |

The artboard keeps its original aspect ratio. The permitted crop is capped at the outer 7% on either side, preserving the window, lamps, table and curtain framing. Both masks and scenery remain on the same transformed artboard. The existing aperture PNG is applied to the Canvas alpha and cached at its backing resolution, avoiding a repeated full-size CSS mask pass during suspension movement; the foreground retains its complementary mask. Portrait devices use a grouped, contained illustration and contextual card rather than stretching or severely cropping the wide artwork. All eight tested viewport sizes fit without page scrolling.

## Preview pacing

The previous complete preview was 30.35 simulation seconds. The refined version is 70.13 simulation seconds, measured at 70.4 seconds in the uninterrupted browser pass including image loading. The count is driven by the actual 29 illustrations, not a forced 60-second deadline: all 13 pre-stop landmarks have at least 2.5 seconds of unobscured visibility, followed by the final Fujairah view and its settling hold.

The preview uses piecewise smoothstep velocity segments with an analytical distance integral. It accelerates gradually at departure, eases down through landmark centres, builds speed again between landmarks and brakes progressively into Fujairah. Normal mission-to-mission travel retains its prior duration/profile. Reduced motion retains its short, gentle preview.

Landmark panoramas make a restrained lateral pass; thin, sparse railway poles communicate faster foreground movement. Scene handoffs occur during a short full-window occlusion. The final image is revealed before the last braking phase finishes. Emirate labels appear at landmarks, with approximately 1.8 seconds at full opacity and gentle entry/exit. Skip, replay and the covered Abu Dhabi reset are preserved.

## Shared audio and suspension

`railMotion.ts` defines spatial front/rear axle contacts. Both the engine and audio consume the same distance crossings, including frame-boundary crossings. Thus departure cadence starts slowly, cruise contacts tighten and braking naturally spreads them apart.

The procedural mix now has five persistent layers: low carriage-transmitted brown-noise rumble, filtered wheel texture, restrained wind, braking friction and brake-pressure hiss. Rail contacts use a short damped low-body impact with a soft noisy attack, replacing the former tiny pitched beeps. A soft compressor preserves headroom. The mix and its shared AudioContext remain continuous across scenes; no reference music or sampled assets were imported.

Physical movement combines slow suspension sway, two restrained rail frequencies, axle impulses and a damped acceleration/braking response. Coffee follows the same acceleration and impulses. All motion decays at rest and is disabled under reduced motion. Measured unscaled preview peaks were 1.24 px horizontally and 1.42 px vertically; normal travel peaked at 1.07 px and 1.28 px. These are scaled conservatively to the rendered artboard. Coffee highlight rotation stayed below 0.51 degrees.

## Validation

- Production build passed. No lint script exists in the project.
- Train tests: 14 passed, including four new regressions covering readable landmarks, continuous speed/distance, paired rail contacts, bounded vibration and settling.
- Complete server suite: 60 passed, 3 pre-existing failures. The two expired-deadline assumptions and missing approved-reviewer fixture remain unchanged.
- Type checking: the same six pre-existing diagnostics remain; no new diagnostics in the refinement.
- Full browser regression suite: 15 checks passed, including all 29 scenes, skip/replay, Abu Dhabi arrival, the real mission UI with explicit authentication/approval fixtures, pending-review lock, approved departure to Dubai, refresh/back/forward, final Fujairah and reduced motion.
- Final active-travel frame samples: 60.0 FPS at 1440×900 (16.8 ms p95) and 390×844 (16.7 ms p95) in headless Chromium. The full-resolution cached aperture fixed the initial enlarged-view compositor cost; no resolution reduction was retained.
- Exact alpha checks compare the optimized Canvas to the original aperture PNG, including its anti-aliased curtain edge, plus opaque-window and transparent wall/table/lamp samples at desktop, tablet and mobile sizes.
- Layout: 1920×1080, 1600×900, 1440×900, 1366×768, 1024×768, 768×1024, 390×844 and 844×390. Mask and foreground bounds match and preserve aspect ratio. Station card hide/reopen works.
- The complete real-time preview was inspected through all 14 landmark captures, with live audio metering running alongside visual movement. All 29 scenes were observed; the journey returned to Abu Dhabi without uncaught browser errors.
- Offline rendering exercised the same live audio class with preview/departure/braking/stop, mute and pause. Preview peak was 0.315 full scale, normal departure peak 0.290, and neither clipped. Moving RMS increased from 0.00279 to 0.05367 under identical state input. Mute and pause reached digital silence; settled idle RMS was 0.00045. Exactly five continuous beds ran across scene changes. Chimes occurred once at each intended arrival, without a spurious bootstrap chime.

Artifacts in this cloud instance: `/tmp/tee-train-refine/` contains viewport captures, `preview-landmarks.jpg`, `live-preview.json`, `audio-metrics.json` and before/after/normal-departure audio excerpts. The live journey still requires the existing configured authentication and published mission database; the browser mission regression uses explicit API fixtures. Physical speakers/headphones, physical mobile devices, Safari and Firefox were not auditioned/tested. Metering does not establish subjective approval on every sound system.

## Exact files in this refinement

| File | Change |
| --- | --- |
| `client/src/components/game/train/LivingTrainCabin.tsx` | Contextual station overlay, compact ticket/replay, shared body transforms and landmark labels. |
| `client/src/components/game/train/train.css` | Viewport-dominant carriage, overlay controls, compact tracker and portrait layouts. |
| `client/src/components/game/train/TrainJourneyEngine.ts` | Readable preview profile, shared axle impulses, damped body and coffee response. |
| `client/src/components/game/train/previewMotion.ts` | New analytic per-scene preview pacing helper. |
| `client/src/components/game/train/railMotion.ts` | New shared distance-to-axle-contact helper. |
| `client/src/components/game/train/SceneryRenderer.ts` | Readable landmark passes, short covered handoffs, sparse fast foreground poles and cached aperture compositing. |
| `client/src/components/game/train/TrainAudio.ts` | Layered continuous rumble/wheels/wind/brakes, physical contacts and headroom. |
| `client/src/components/game/train/journeyScenes.ts` | Preview-only viewing-time metadata; scene/station identities and original image paths unchanged. |
| `server/trainJourney.test.ts` | Four focused pacing/suspension/contact regressions. |
| `scripts/qa-train.py` | Longer real-time preview coverage and requested desktop viewport checks. |
| `docs/living-train-cabin.md` | Link to this refinement and current behavior. |
| `docs/living-train-changes.md` | Distinguish the initial implementation inventory from this focused refinement. |
| `docs/living-train-refinement.md` | This implementation, exact file list and validation report. |
