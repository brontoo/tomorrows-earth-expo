# The Seven Emirates — implementation report

The homepage and `/eco-journey` now use one interactive travel book. The flow is cover → opening → contents → page turn → Emirate reveal → challenge → verified stamp → next chapter. The seventh newly collected stamp turns automatically to the final spread. Completed chapters remain revisitable. `/my-journey` opens the book's stamp spread; the existing embedded dashboard passport retains its points and badge information.

## Architecture and files

| File | Responsibility |
| --- | --- |
| `client/src/components/book/TravelBook.tsx` | Persistent shell, server catalogue/passport adapter, chapter reveals, navigation, stamp animation, collection and final spread |
| `client/src/components/book/chapters.ts` | Single chapter order, identifiers, routes, existing mission slugs, media, stamps, completion derivation and navigation reducer |
| `client/src/components/book/BookScene.tsx` | Lazy Three.js renderer; physical covers, spine, page stack, bookmarks, lighting, shadows, hinged cardstock groups and GSAP timelines |
| `client/src/components/book/pageGeometry.ts` | Spine-anchored segmented page deformation, curvature, corner lift and settling |
| `client/src/components/book/BookAudio.ts` | Gesture-unlocked paper/open/fold/stamp effects and completion notes, owned voice/context cleanup |
| `client/src/components/book/persistence.ts` | Per-profile presentation state and safe location migration |
| `client/src/components/book/book.css` | Parchment material, responsive book spreads, paper inserts, chapter tabs and accessibility states |
| `client/public/book/` | Seven compressed chapter clips, matching resting-frame posters, seven still references, cover reference |
| `client/src/App.tsx`, `client/src/pages/EcoJourneyPage.tsx`, `client/index.html` | Entry routes, stamp route and book identity |
| `client/src/components/entry/EntryScene.tsx`, `client/src/pages/Login.tsx` | Book artwork and copy around the unchanged authentication flow |
| `client/src/components/field/GameShell.tsx`, `field.css`, `StudentJourneyOverview.tsx` | Shared chapter bindings, book navigation, paper mission shell and dashboard references |
| `client/src/pages/MissionDetail.tsx` | Same mission UI and mutations, same-chapter return links, chapter-access presentation gate and margin note |
| `client/src/pages/Missions.tsx`, `MyJourney.tsx`, `ZoneDetail.tsx` | Updated chapter language and shared bindings |
| `server/travelBook.test.ts` | Nine model, migration and deformation tests |
| `scripts/qa-book.py` | Browser integration QA with explicit authentication/catalogue/verification fixtures |

Three.js, GSAP, React and the existing icon library were already installed. No dependencies, lockfiles, database schema or backend mission procedures were changed.

## Retired systems and removals

Removed the entire former `client/src/components/game/` presentation directory: cabin, speed and scenery engines, rail physics, boarding, preview, guide intro, train audio and their motion/CSS helpers. Removed `client/public/train/`, `character.glb`, the unused pod model, the character SVG, its unused decorative component, the old unused gem sprites and journal-theme stylesheet, and the orphaned former Home/Gateway implementations. The old presentation audio helper was unused after replacement and removed. Old train-specific tests, mask generation, and browser harnesses were replaced by book-specific tests and QA. Superseded train/mascot experience documents were removed.

No replacement mascot was added. Active presentation copy is English. The two legacy storage-key strings remain solely in the migration adapter and its test.

## Chapter data and mission integration

| Chapter | Existing mission slug |
| --- | --- |
| Abu Dhabi | `water-detective` |
| Dubai | `energy-smart-check` |
| Sharjah | `waste-sort-study` |
| Ajman | `micro-habitat-observer` |
| Umm Al Quwain | `climate-evidence-basics` |
| Ras Al Khaimah | `design-a-better-route` |
| Fujairah | `one-week-impact-choice` |

The published mission catalogue resolves these slugs to database IDs. The existing passport provides per-mission status. Only `verified` and `completed` count toward stamps. Submission, pending verification and revision requests do not unlock chapters. A missing catalogue entry presents an unpublished-challenge message. Network failure blocks actions and offers reconnection.

The first incomplete chapter defines the sequential frontier; previously completed chapters can be revisited. Chapter URLs are clamped to accessible chapters. The mission screen also checks chapter access before enabling start/submission controls. Existing backend mission authorization, publishing, scoring, evidence validation, teacher verification and persistence remain authoritative and unchanged. This presentation gate is not a new backend authorization mechanism.

The existing mission route expands into a readable paper insert, with an explicit return to the same chapter. Authentication continues through the existing login route and retains the chapter destination. Guest readers can inspect Abu Dhabi and sign in to save mission work.

## Media inventory and handling

The supplied `PAPER 7E.rar` contains seven 2752×1536 Emirate stills, one 1376×768 cover image and one 1920×1080, 24.93-second silent reference film. Every still and the entire film were inspected before implementation. Seven separate source films were not present.

Seven reveal clips were encoded from the supplied master with FFmpeg, H.264, CRF 23, 1280×720, no audio and fast-start metadata:

| Chapter | Master range (seconds) | Supplied still |
| --- | --- | --- |
| Abu Dhabi | 1.50–4.10 | AD.jpg |
| Dubai | 5.05–7.65 | DXB.jpg |
| Sharjah | 8.55–11.20 | SHJ.jpg |
| Ajman | 12.50–14.65 | AJ.jpg |
| Umm Al Quwain | 15.55–18.10 | UMQ.jpg |
| Ras Al Khaimah | 19.05–21.40 | RAK.jpg |
| Fujairah | 22.50–24.90 | FUJ.jpg |

Each `*-rest.webp` was extracted from that encoded clip's final frame, preserving framing, aspect ratio and color through the interactive handoff. Each `*-reference.webp` is the corresponding supplied still, resized to 1376×768 for asset-error fallback. The video and resting image occupy the same layer; the challenge slip appears after settling. Browser video controls are suppressed. Playback occurs after chapter selection, with Skip Animation, autoplay-rejection handling, media-error handling, hidden-document pause, and an eight-second loading deadline.

The physical Three.js cover/page-turn shell is combined with the supplied cinematic imagery. Detailed chapter architecture stays in the supplied film/poster; it is not reconstructed as individually selectable landmark models. Lightweight hinged cardstock geometry supplies the realtime transition layer. No architectural GLBs were supplied.

The committed media set is approximately 4.1 MB. The cover fetches no chapter video. Active chapters load their film and poster; only the next film's metadata and poster are staged. Original stills are fetched as fallback. The source RAR and unrelated original media are kept outside the checkout.

## Page turns, stamps and persistence

A 32×12 segmented mesh keeps its spine fixed while each column follows a delayed arc. Vertical displacement, progressive bending and corner offset give the leaf flexibility. One GSAP timeline coordinates fold-down, turning and settling; interrupted transitions kill the previous timeline. Cover rotation is anchored at the spine. Camera FOV and distance respond to available width.

Each verified chapter gets its own Emirate map seal. A paper-press animation, synthesized impact and restrained chime mark newly seen stamps; the seven-seal collection uses the same server-derived completion data. Certificate export was omitted because the existing platform has no certificate pipeline.

`sevenEmiratesBook:v1:<profile>` stores the last chapter and acknowledged stamp-animation IDs. These IDs never grant a completion or unlock. Legacy location is read once, then migrated; only obsolete per-profile presentation and preview keys are removed. No student mission progress, unrelated storage keys, other profiles, or backend records are erased. URL parameters restore the current chapter/spread on refresh. The sound preference has its own key.

## Performance and accessibility

The Three.js module loads lazily. Static scenes render on changes and resize rather than continuously. Pixel ratio is capped at 1.6, with one selective 1024px shadow map. The page mesh and low-poly hinge groups are small. Replaced geometry/materials are disposed; GSAP timelines, observers, textures, WebGL contexts, video playback and audio sources are cleaned up on route exit. Reduced motion shortens page turns, skips reveal playback and removes stamp overshoot. WebGL loss/unavailability falls back to imagery and functional semantic controls.

Navigation uses semantic buttons/links, explicit chapter state labels, disabled locked controls, visible keyboard focus, a skip link, status announcements and focus on chapter readiness. All new labels are English. Mobile spreads reflow into readable paper pages with controls at usable sizes. Existing mission forms retain their labels and validation.

## Validation and limits

- Production frontend build passes. Vite reports the existing large-chunk advisory.
- All nine new unit tests pass. The full suite runs 58 tests: 55 pass and the same three pre-existing project-submission tests fail (two date assumptions after the May 2026 deadline; one missing reviewer fixture). Fourteen retired railway-physics tests were replaced by nine book tests.
- Type checking reports the same six pre-existing errors: undeclared MediaPipe package, AdminDashboard `votes`/`voteCount`, absent EcoGuide router and its implicit-any callback, nullable SDK argument, and the mission seed script's transaction typing. The new book code introduces no type errors.
- No lint script is defined in package.json. New frontend code was formatted with the repository's Prettier.
- `scripts/qa-book.py` tests real rendering, assets, navigation and persistence against explicit API fixtures. It covers cover opening, all seven films, current/next loading, mission-route submission, pending review, verified stamps, sequential locks, final completion, replay, refresh, mobile/tablet, sound, reduced motion, keyboard control, denied media, WebGL fallback, unpublished missions and repeated navigation.
- Live local checks use the actual development server and migrated local database. That database initially has no published mission catalogue. Browser-fixture approval does not establish production login, real teacher verification or production storage connectivity; those external integrations remain outside this validation.

Run development with the saved environment startup instructions, then use `python scripts/qa-book.py`. Browser artifacts are written to `/tmp/tee-book-qa`. Additional final browser checks passed for mobile cover framing, unclipped mobile collection controls, locked mission deep links and authenticated teacher account navigation. The final fixture run passed all 12 browser check groups with zero page errors. Across 14 additional chapter changes, post-GC JS heap went from 21,043,755 to 21,352,595 bytes (about 0.3 MB growth), with one WebGL canvas retained. This is a bounded smoke check, not a long-duration device benchmark.
