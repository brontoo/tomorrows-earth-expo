# Student missions and account pages

The student journey now uses [The Seven Emirates travel book](seven-emirates-book.md). That document describes the current routes, media, chapter model, persistence, removals and validation.

`MissionDetail` retains the original mission lookup, academic-year query, completion state, start/submit mutations, required evidence, teacher feedback and revision resubmission. Canonical chapter missions use the shared chapter configuration and return directly to their book page. Chapter access is checked before enabling start/submission controls. Additional published missions remain supported.

`GameShell` presents mission content as a readable paper insert and links back to the book and its stamp collection. `/missions`, `/explore`, `/explore/:categorySlug` and `/impact` retain their server-backed content and recovery states. `/my-journey` opens the book-native stamp spread. The embedded student account passport retains points, levels, badges and recent events. Student school-project tools, profile/password forms, teacher/admin dashboards and sign-out retain their existing logic.

Use `python scripts/qa-book.py` for the current browser suite. Its API/authentication/verification responses are explicit fixtures; actual routes, rendering, assets, video and storage are exercised. No real student account or production record is changed. Browser results are in `/tmp/tee-book-qa/`.
