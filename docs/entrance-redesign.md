# Gate and sign-in redesign

The root gateway and `/login` now share an illustrated field-station identity: warm paper, forest ink, clay accents, generous editorial type, an arched landscape and ticket-like choices. The original train-platform JPEG is reused without changing its bytes or filename. Local Lucide icons supply the leaf seal, compass, plant, ticket, train and research motifs. No new image or remote logo is required.

## References reviewed

The requested [leereilly/games](https://github.com/leereilly/games) repository is a catalogue, not a reusable component library. Its README was reviewed at `c67976ddcf6f7aef26dc3884116205ab9ef40f74`. Two linked games were inspected in source:

- [HexGL](https://github.com/BKcore/HexGL), `6addc95a2fce3bf05f4d751823cc054c61a16d68`: `index.html` and `css/multi.css`. Adapted the title-screen composition, immersive scene behind the menu, clear primary action and distinct menu states.
- [Hextris](https://github.com/Hextris/hextris), `3f4847dc8fd7dab3d1c87e6324b9159d92fbd396`: `index.html` and `style/style.css`. Adapted the readable separation between scene, controls and small status labels, plus immediate focus/press feedback.

These are interaction and composition references. The implementation is original; no game assets, source, tracking code or dependencies were copied into the product.

## Behavior

Gateway choices are semantic keyboard-accessible links. Eco Train retains `/login?redirectTo=%2Feco-journey`; Expo retains `/login?redirectTo=%2Fdashboard`. The latter uses the existing role-based dashboard router.

Login displays the selected experience, retains the existing local login mutation and legacy Supabase fallback, normalizes email, preserves role mapping and cached user data, and navigates to the requested internal destination. After credentials establish the server cookie, a document navigation lets the shared auth provider initialize from that session. Previously a client-side route change could leave the provider unauthenticated until refresh. Already-authenticated visitors continue through the existing automatic redirect. External/protocol-relative/backslash destinations fall back to the Eco Train route.

The form includes visible labels, username/current-password autocomplete, native required/email validation, an accessible password toggle, disabled pending inputs, a readable busy state and an announced rejection message. Existing account creation remains linked at `/signup`.

On mobile the form precedes the illustration, keeping sign-in within reach in the initial viewport. Both pages scroll naturally at small heights. Motion is limited to staggered entrances, small scenery settlement and hover/press feedback; reduced-motion mode disables decorative animation.

## Validation

`python scripts/qa-entry.py` checks both pages at 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×720 and 844×390. It verifies artwork loading, no horizontal overflow, mobile submit visibility, both keyboard choices and return navigation, three login destinations, normalized credentials, password reveal/hide, pending state, rejection/fallback handling, reduced motion, internal destination fallback and the signup link. Screenshots and `report.json` are in `/tmp/tee-entry-qa/`. Desktop and phone compositions were opened and visually inspected; low-contrast paragraph inheritance and mobile form ordering were corrected during review.

Authentication responses in this QA are explicit fixtures, with destination sentinel documents for successful submits. No real account, email or live identity service was used. Authentication endpoints, server roles, mission logic and train progression are unchanged.

Production build passes with the existing bundle warning. Type checking retains the same six pre-existing diagnostics outside these pages. No dependency manifest or lockfile changed.
