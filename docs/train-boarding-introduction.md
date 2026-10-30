# Journey briefing → platform → Living Train Cabin

## Original artwork

The supplied RAR contains `Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg` (including its double extension). The original filename and JPEG bytes are preserved under `client/public/train/`. Dimensions are 2752 × 1536; SHA-256 is `f904799196ae5dae75e197d628340c1a55fdb5d55ed4b386b33cbf2d707a9361`. No replacement artwork was generated. Asset decoding and the doorway projection use the real file.

## Introduction and boarding flow

The opening, guide, mission and travel briefing now share the gateway/login field-station identity: Playfair Display and Inter, forest green, neutral cream, clay accents and sage panels. The yellow notebook grid, tape, clip, coffee stains and floating illustration scraps were removed from this route. The original 3D guide and boarding CTA remain. The guide is an eco-guide and travel companion; the mission describes exploring, solving challenges and collecting seven station stamps. Numbered route markers track the three briefing steps.

The final travel briefing uses the existing UAE outline and the shared station order: “7 Emirates. 7 Stops. 7 Eco Challenges.” Abu Dhabi is highlighted on a simple seven-stop route. The route is conceptual; it does not invent new geographic boundaries or mission content. The briefing reveals the platform after the briefing and a soft chime.

The platform is an in-route state, not a separate page. Only the supplied JPG is accepted as its canonical art. The neutral invitation panel and forest-green `BOARD NOW` button use a clean platform-floor area; the portrait layout crops around the mascot/door focal zone. The flattened character is static. Button focus/hover adds a restrained doorway light cue.

Artwork centring belongs to the outer `.boarding-platform-art` wrapper; the camera tween belongs to its inner `.boarding-platform-camera`. This keeps responsive percentage positioning independent of GSAP's transform normalization. On boarding, the camera makes a small push toward the actual door. A warm polygon expands from the projected doorway to cover the viewport. Only then is the existing cabin mounted behind that cover. The cabin's simulation remains held until its artwork, current scenery and real first Canvas frame are ready. The warm cover retracts, the cabin's existing boarding message appears and its unchanged preview engine starts. Reduced motion omits the zoom and uses a brief covered reveal.

Keyboard focus moves from the platform CTA to the cabin heading after the covered reveal. The profile's `boarded` flag is written only after entry completes. Refreshing before completion does not save a half-boarded state. Existing returning-user tickets go directly to the cabin; the ticket's `Replay Journey Preview` control continues to replay the journey without replaying the introduction.

## Sound and lifecycle

`PlatformAmbience` is a small procedural exterior ambience: low mechanical noise, quiet electrical hum and a brief air/confirmation cue. It receives the existing shared AudioContext rather than creating another context or train engine. It fades out as the existing `TrainAudio` mix starts behind the reveal. A shared preference event keeps the visible platform mute control synchronized with the temporarily covered cabin. All platform sources and GSAP timelines are stopped on unmount.

No changes were made to `TrainJourneyEngine`, the 29-scene sequence, preview pacing, rail-contact model, cabin vibration, coffee physics, station bindings, mission mutations, passport scoring or rewards. The compact cabin ticket and contextual challenge remain as previously implemented.

## Validation

- Build passed with the existing large-chunk warning.
- Type checking retains the same six pre-existing diagnostics; no boarding diagnostics were introduced.
- All 14 existing train-engine regression tests passed.
- The actual opening, guide/mission copy and UAE briefing were inspected in-browser. The briefing fits 1440×900, 1366×768, 1024×768, 768×1024, 390×844 and 844×390. The short landscape layout was tuned to avoid overlap with the progress rail.
- The missing-artwork path displays a retry state and neither starts the cabin nor writes boarding progress.
- Real-image browser checks pass for the complete introduction, keyboard boarding, delayed catalogue readiness, one AudioContext, source cleanup, reduced motion, Abu Dhabi arrival, saved progress and direct preview replay.
- The original platform was visually reviewed at 1440×900, 1366×768, 1024×768, 768×1024, 390×844 and 844×390. Portrait framing keeps the mascot and open door visible; short landscape positioning avoids covering the mascot with the invitation. Desktop camera-push and warm covered frames were captured and reviewed.
- All 15 full journey browser checks pass, including the real-time 29-scene preview, final Fujairah hold, covered reset, Abu Dhabi arrival, pause/visibility, keyboard skip/replay, verification-gated departure, Dubai persistence, mission back/forward navigation, reduced motion and responsive masks. There are no uncaught browser errors in those flows.
- Authentication, catalogue and teacher-verification data are explicit API fixtures; the application routes, artwork, rendering, audio and transition are real. These tests do not establish live external authentication.

Commands from the repository:

```bash
export COREPACK_HOME=/workspace/.cache/corepack
corepack pnpm build
corepack pnpm check
corepack pnpm exec vitest run server/trainJourney.test.ts --maxWorkers=2 --minWorkers=1
# Uses the original supplied JPG:
python scripts/qa-boarding.py
python scripts/qa-train.py
```

Python QA uses the existing Playwright/Chromium tools. Screenshots and the lifecycle report are in `/tmp/tee-boarding-qa/` in this instance. Authentication and teacher-verification states in the QA remain explicit API fixtures; they do not establish live external authentication.

## Files

| File | Purpose |
| --- | --- |
| `client/src/components/game/EcoJourney.tsx` | Notebook copy, travel motifs, guide/mission/travel stages and entry-state orchestration. |
| `client/src/components/game/intro/JourneyBriefing.tsx` | Existing UAE outline and shared seven-stop paper briefing. |
| `client/src/components/game/intro/BoardingPlatform.tsx` | Intentional platform interaction, spatial doorway cover and readiness-controlled reveal. |
| `client/src/components/game/intro/boardingAssets.ts` | Original artwork filename/focal metadata and staged image decoding. |
| `client/src/components/game/intro/PlatformAmbience.ts` | Lightweight shared-context platform ambience and interior crossfade. |
| `client/src/components/game/intro/boarding.css` | Notebook travel details, platform framing, doorway light and responsive/reduced-motion styles. |
| `client/src/components/game/train/LivingTrainCabin.tsx` | Optional entry hold/first-frame callback and mute synchronization; existing train engine unchanged. |
| `client/src/lib/journalMotion.ts` | Publish preference changes to the two briefly overlapping views. |
| `scripts/qa-boarding.py` | Original-artwork QA and explicitly opt-in image-response lifecycle fixtures. |
| `scripts/qa-train.py` | First-time regression flow now requires intentional `BOARD NOW` before cabin preview. |
| `docs/train-boarding-introduction.md` | This implementation and validation record. |
