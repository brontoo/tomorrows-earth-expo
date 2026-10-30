# Entrance identity through boarding

The gate/login identity now continues through the Eco Journey opening, Meet Bu Ghosn, mission briefing, UAE route briefing and platform. These changes follow the user's approval of the field-station entrance design.

## Design

- Use the same global `--font-display` (Playfair Display), Inter body/control type, neutral `#f4f0e5`, forest `#203e32`, clay `#ad623d` and sage surfaces as the entrance.
- Reuse `EntryBrand` and matching focus states. The brand supplies its own foreground so global link colours cannot turn it neon green.
- Remove `EcoJourney.css` and `fieldJournal.css` imports from this route. The old notebook textures, taped edges, paper grid, colour strip, coffee stain and illustration particles are no longer rendered. The legacy CSS files remain available for other work; the new route does not load them.
- Give the original 3D guide a dedicated arched stage. Bounds-based camera framing centres the model and keeps it within the available width and height. Model geometry, colours and its small idle sway are unchanged. Loading failure uses the existing mascot SVG.
- Present readable editorial copy alongside the guide. The final briefing pairs three short headline lines with the existing UAE outline, seven ordered stations and a clear continuation button.
- Stack the guide and copy on phones and let short viewports scroll naturally. Hidden story slides do not reserve the final map's height in earlier steps. Progress and controls occupy normal layout rows so they do not overlap the content.
- Restyle the platform invitation, header, status and button to match. Preserve the original station JPEG unchanged. Use a neutral doorway light cover for the existing spatial boarding transition.

## Motion and integration

The named GSAP beats, reading holds, staged reveals, deliberate `BOARD NOW`, first-frame readiness gate, shared AudioContext, mute, reduced motion, keyboard entry/focus, persistence and direct returning-user resume are retained. The cabin, scenery engine, sequence, timing, mission routes, verification gates and rewards are unchanged.

Responsive artwork positioning now belongs to an outer wrapper; GSAP scales its inner camera layer. This fixes a viewport-resize issue where a transform cached on desktop could override percentage centring on a phone. Portrait invitation centring uses margins rather than an individual CSS translate on a tweened element.

## Checks

- `python scripts/qa-intro-identity.py`: opening/guide/mission/map captures at 1440×900, 390×844, 320×720, 844×390 and 768×1024; declared entrance typography, no notebook background and no horizontal overflow. Guide captures wait for the actual scheduled reveal before being reviewed.
- `python scripts/qa-boarding.py`: real artwork, six platform layouts, explicit mascot/door focal-point bounds and invitation bounds, keyboard entry, delayed readiness, one audio context, source cleanup, reduced motion, focus and saved progress.
- `python scripts/qa-train.py`: full journey and mission/progression regression.
- Production build and type check: the existing bundle warning and six unrelated TypeScript diagnostics remain documented.

Visual artifacts are in `/tmp/tee-intro-identity/` and `/tmp/tee-boarding-qa/`. Authentication/catalogue/passport in browser checks are explicit fixtures; the routes, assets, canvas, audio and transitions are real.

Final validation: the production build passed; all 15 full journey checks, the three boarding scenarios, five responsive intro layouts and all six motion checks passed. The new intro and boarding contact sheets in `/tmp/tee-game-motion/` were opened and inspected after the final style/geometry changes. Type checking retains the same six existing diagnostics outside this work.
