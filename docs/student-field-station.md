# Student field station and Emirate challenge pages

The approved entrance identity now continues through every student game route: shared Playfair Display/Inter type, neutral cream, forest green, sage surfaces, clay accents, quiet transitions and original illustrated UAE scenery.

## Pages and navigation

- All seven canonical station mission slugs use the redesigned `MissionDetail`: original Emirate image, mission metadata, numbered real-world steps, progress/review state, evidence/reflection form, teacher feedback and a return to the train. The same component supports additional published missions.
- `/missions` is an illustrated, searchable catalogue with a challenge-type filter and authoritative mission states when signed in. Empty and failed requests have explicit recovery states.
- `/my-journey` shows server points, configured levels, seven station stamps, actual badge configuration and recent point events. Only completed/verified mission states earn a station stamp. Pending review is not a reward.
- `/student/dashboard` opens on a game-focused overview: next uncompleted canonical station, continue-journey action, verified stamp count, server point total, pending reviews, route and links to missions, Explore and school impact.
- School workspace, project tools, teacher assignment, Wikipedia help, voting, resources, profile and sign-out remain reachable. The existing school-project metrics use a local accessible chart rather than a remote chart image. The unused estimated-impact screen is removed; the shared impact link uses reviewed server measurements.
- Student profile/password forms retain the existing mutations, validation and success/error feedback. They use shared auth state, as does the dashboard and welcome message.
- `/explore`, `/explore/:categorySlug` and `/impact` use the same navigation and layouts. Zone content and mission membership still come from server data. School impact preserves each metric's own unit and does not infer personal carbon savings from project counts.
- The cabin ticket, caption, challenge controls and action colours/type match this identity. The cabin artwork, geometry, physics, preview timing, scene sequence and engine are unchanged.

`GameShell` owns consistent navigation and route selection; all six journey links remain visible on phones. The shared brand uses local assets. The welcome message is a small, dismissible bottom-corner notification, displayed once per account per browser session.

## Progress and submission behavior

The original `missions.getBySlug`, academic year, completion query, start/submit mutations and cache invalidation remain. Required evidence still blocks submission when blank. Submission sends the same mission/completion IDs, evidence and reflection. Inputs disable while a submission is pending. Teacher feedback and revision resubmission remain available. A progress-loading failure disables starting until the student retries successfully. No client-side point award or station unlock was added.

The dashboard derives canonical station completion from the shared station manifest and server passport mission states. It identifies the first incomplete station; its route shortcuts return to the existing train, which retains authoritative progression and departure behavior. Badges, points, levels and recent events are never fabricated to fill empty states.

## Validation

- `python scripts/qa-field.py`: all seven missions and six related pages at desktop/phone widths; mission search/reset; acceptance and required evidence; pending request state; unchanged mutation payloads; no stamp before verification; verified stamp/points and next-station display; teacher revision feedback; progress/query error retry; missing/empty states; teacher-assignment workspace; student/guest boundaries; mobile navigation at 320px and reduced motion.
- `python scripts/qa-student-account.py`: profile/password payloads, password mismatch rejection without mutation, success messages, cleared password inputs, mobile profile and sign-out.
- `python scripts/qa-train.py`: all 15 end-to-end checks pass, including the real-time 29-scene preview, final Fujairah/reset, the redesigned mission submission route, pending-review departure lock, verified Dubai departure, persistence/back-forward, reduced motion, masks/layouts and no uncaught browser errors.
- Browser authentication/catalogue/passport/teacher verification are explicit fixtures. Rendering, routes, original assets, canvas and audio are real; no real student record, account or credential was modified during QA.
- Desktop and phone mission, dashboard, passport and profile captures were inspected. Screenshots/report: `/tmp/tee-field-qa/`; cabin captures/report: `/tmp/tee-train-qa/`.
- Production build passes with the existing bundle warning. Type checking retains the same six pre-existing errors outside this work. No server router, database schema, dependency manifest or lockfile changed.
