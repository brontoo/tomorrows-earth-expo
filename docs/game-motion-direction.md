# Game motion direction

Reference studied: [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion), commit `e627941543d9988b155dc610bb9cc0115a5e365e`. The motion-design, review-loop and sound-design skills, `src/lib.ts`, masked reveal primitives and simulation director were read. This is a live interaction adaptation using the game's existing GSAP and Web Audio stack; no Remotion runtime, footage, audio samples or dependency changes were introduced.

## Applied principles

- Arrival uses `(0.16,1,0.3,1)`, departure `(0.6,0,0.9,0.35)` and travel `(0.65,0,0.35,1)`. Exits are shorter than entrances. Small interactive responses use matching CSS curves.
- Named beats in `motion/gameMotion.ts` coordinate the guide at 0.52s, mission at 5.5s, travel briefing at 11s and platform at 18.5s. Text settles before its reading hold. Lines reveal behind a clip; seven route markers enter at 65ms intervals. A direct travel-briefing action still skips ahead.
- The notebook establishes a sequence: paper lands, headline lines arrive, supporting copy and invitation follow. A quick start completes/cancels that entrance so it cannot compete with the outgoing paper.
- Pointer depth follows a frame-rate independent exponential response, bounded to 12px horizontally and 9px vertically, and returns to rest. It only affects decorative layers and sleeps after settling. Touch and reduced-motion modes avoid pointer depth.
- The existing 3D guide now has a bounded 4-degree idle yaw and small roll rather than a continuous full rotation. It remains facing the student. Reduced motion freezes the idle; hidden pages do not advance/render it.
- The platform establishes artwork before the invitation. The generic page wipe was removed. On boarding, the invitation leaves in 220ms while the camera travels toward the real doorway; the projected doorway cover starts at 880ms and expands over 620ms, overlapping the camera. The shared-context air cue ends with this cover. The original image remains unchanged.
- Cabin vibration now lives in a dedicated physical layer containing the scenery, matching masks, foreground and coffee. Window captions and Skip Preview keep a stable position, so reading and pointer interaction do not compete with the suspension.
- The covered readiness handoff and cabin focus transfer are retained. A second cabin zoom was removed because it competed with the engine suspension. Caption changes, controls, ticket and station items arrive in ordered groups.
- Challenge cards remain mounted for their short exit and can reverse when reopened. Stamp impacts and the count respond to authoritative passport changes. Hover, press, focus, pause and landmark labels have coordinated responses. Mission mutations and reward eligibility are unchanged.
- Continuous scenery, rail contacts, coffee, suspension, preview timing and station progression remain under the existing train engine. A motion design pass must not give these a second animation clock.
- Intro time pauses while the tab is hidden. Timeline/source/listener cleanup is scoped to component lifetime. Reduced motion removes camera travel, stagger displacement and decorative CSS animation while retaining legible state feedback.

## Verification

`python scripts/qa-game-motion.py` records real browser footage and captures timestamped frames at intro/boarding beats. It also checks bounded pointer depth, settled reading copy, challenge interruption, hidden-tab briefing pause, one AudioContext and mobile reduced motion. Contact sheets and footage are written to `/tmp/tee-game-motion/`. The frame labels use actual elapsed capture times, rather than assuming screenshots are instantaneous.

`python scripts/qa-boarding.py` checks canonical-artwork layouts, intentional keyboard entry, readiness under delayed mission loading, audio cleanup, mute/reduced motion, focus transfer, saved boarding and direct replay.

`python scripts/qa-train.py` covers the real-time 29-scene preview through Fujairah/reset, pause/visibility, mission submission and teacher-verification gating, station travel, persistence/back-forward, masks, layouts and English-only UI.

Auth/catalogue/passport responses are explicit fixtures in browser QA; rendering, artwork, audio and application routes are real. The suite does not validate external authentication services.

Build and the 14 train-engine tests pass. Type checking still reports the same six existing diagnostics outside these changes. The existing large bundle warning remains.

Final frame review: `intro-contact.jpg` shows the masked line reveals, front-facing guide holds and ordered route at 0–18.9s. `boarding-contact.jpg` shows the invitation exit, ongoing camera push at 0.85s, doorway expansion at 1.03s, full cover at 1.52s and cabin reveal at 2.22s. Both sheets were opened and inspected after the physical-layer change. `gameplay-motion-review.webm` contains the corresponding browser capture.

All six dedicated motion checks passed, including the stable Skip Preview bounds during vibration, interruptible card exit/reopen and hidden-tab pause. The browser suite's platform wait allows the longer reading holds and software-rendered browser overhead; it does not accelerate the game's clock.

The final full journey run after separating the physical cabin layer passed all 15 checks, including shared mask geometry at every tested viewport and no uncaught browser errors.
