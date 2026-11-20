# Task 16 school library journey

The feature branch adds the library to the homepage and `/eco-journey` using the existing frame player. The library media package was prepared locally. Hosted release requires permission to publish the package and access to the Vercel project that serves the production domain.

## Source and scene boundaries

The owner approved the uploaded `Untitled design (1).mp4` after the checksum mismatch was identified. Its SHA-256 is `14aaa5de2d4f018793f847722e7f19d2fa80ffc2348a042e0ba552cae42e17f5`. FFprobe found 1,376 H.264 frames at 1920 × 1080 and 30 FPS, plus AAC audio. The video stream is 45.866667 seconds and the container is 45.888 seconds. The frame player displays stills in response to input and does not run the audio track.

| Zone | Source frames | First source time | Packaged global frames | Primary input |
| --- | --- | --- | --- | --- |
| Approach and entry | 0–457 | 0.000 s | 0–365 | Pull with two fists |
| Panorama | 458–717 | 15.267 s | 366–573 | Move one fist horizontally |
| Discover and approach the book | 718–1347 | 23.933 s | 574–1077 | Pull with two fists or move one fist horizontally |
| Original book | Book-local 0–1672 | — | 1078–2750 | Move one fist horizontally |

The panorama begins when the entrance door edge leaves the view and the camera starts turning past the shelving. It ends when the central display settles in the center of the view. The book is visible at that point, then rotates and leaves the display around 29 seconds. The final packaged source frame is 1347 at 44.900 seconds.

The source repeats a near-identical image at frame numbers congruent to 1 modulo 5. A 24 FPS export that removes those samples retains the maximum adjacent-frame motion measured at 30 FPS in the panorama and floating-book sections. A blind 24 FPS conversion dropping a different phase raised the adjacent-frame motion peaks from 21.60 to 28.05 in the panorama and from 11.23 to 16.57 in the floating-book section on a 0–255 mean absolute RGB scale. The selected cadence retains the original timestamps for every selected frame. The package contains 1,078 Full HD WebPs with 164,107,042 bytes total (156.5 MiB), a median frame size of 153,429 bytes and no exact duplicate files or detected black frames. Its media version is `library-83e47f63f8ba623f` and its manifest SHA-256 is `50c3e7391eafffbff908d1bbe9b91c9ccbe7b43d1685e2049f87c51e5efa10aa`. [Manifest](qa/task-16/manifest.json) · [Media integrity results](qa/task-16/library-media-qa.json). [Overview](qa/task-16/library-overview.jpg) · [Boundary contact sheet](qa/task-16/library-boundaries.jpg) · [Source inspection](qa/task-16/source-inspection.json) · [FPS measurements](qa/task-16/fps-comparison.json)

## Seam and existing media

Source frame 1347 had the highest SSIM among the final 32 source frames against the original closed-book frame. The cover artwork and overall outline had their strongest gradient match at zero translation. The lower shadow had a best vertical alignment offset of two pixels. The sampled artwork was darker by about 3–6 RGB levels, and the upper background averaged 1.50 levels of absolute RGB error. The corner positions, cover size, perspective and artwork matched visually at the handoff.

The terminal correction progressively applies the small difference to the approved original cover over the last 13 source-frame intervals. It starts at zero weight and finishes at 88%, so the final intro image is distinct from the original cover. It uses only the supplied video and original book frame, without geometric remapping. The full-frame luminance block SSIM improved from 0.7798 to 0.9898 and RGB mean absolute error fell from 6.97 to 1.44 on a 0–255 scale. The stage continues on the same canvas and scheduler in either direction. [Uncorrected comparison](qa/task-16/source-seam.jpg) · [Regional measurements](qa/task-16/seam-regions.json) · [Encoded seam and first page-turn frame](qa/task-16/encoded-seam.jpg) · [Adjacent-frame measurements](qa/task-16/seam-continuity.json)

All 1,673 existing WebPs were independently read and hashed in both the local upstream book checkout and the public-media archive. Their sizes and checksums match the original manifest. The book remains `7e-1bc718ef5e77`, with manifest SHA-256 `96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f`. The closed-book WebP SHA-256 is `7ecd4d5184e62142c5a8d0f6600258514332d45144d30b2c6f947c0f4401fda5`.

With the library enabled, adding 1,078 to a book-local frame gives its global index. The original chapter and mission lookup uses the book-local index. The scheduler uses one bounded cache, coalesces input in RAF and fetches adjacent global frames across the seam. Direct chapter links load library metadata for this mapping and start their frame window in the book.

## Hand controls

The recognizer uses the approved Model B with a two-hand limit and the existing 68 ms inference interval. Camera access starts only after the visitor enables it. The dual-fist mode requires two stable closed fists for 135 ms. It tracks each palm by position, measures the geometric mean of wrist-to-knuckle length and knuckle span, and compares changes in log size. Both palms must move in the same depth direction and exceed a 2.2% dead band. A two-sample filter, palm-shape check and confidence hysteresis suppress tremor and false changes. A covered or released hand stops movement immediately. Reacquisition clears the depth reference and a brief grace period prevents switching to horizontal scrub during momentary loss. The preview offers a reverse-direction option.

Single-fist scrubbing retains the original 425 frames-per-camera-width gain, palm smoothing and direction. Mouse, touch, keyboard, the frame slider and all seven chapter jumps remain available. The intro has no mission UI and frame navigation never issues an award request.

## Verification and release status

The Vercel production build command completed locally. The targeted book and frame tests passed 128 checks, and the media-tool suite passed 35 checks. The complete repository tests still report the same three project-submission failures reproduced on `main`. They involve the elapsed submission deadline and the test runner's reviewer access. The full type check also reports the same five errors reproduced on `main`. Education data and server authorization code were outside the change.

Headless Chromium exercised the actual generated and original local assets on desktop and a 390 px mobile viewport. It checked the entrance, panorama, discovery, closed book and first Abu Dhabi frame in both directions, chapter jumps, keyboard, mouse, native touch, 121 rapid slider events and camera opt-in. The canvas held its previous image during an imposed request delay and received zero clear calls. Initial intro frame requests were 12 desktop and five mobile. A direct link to Fujairah fetched zero intro frames. [Browser and cache results](qa/task-16/production-browser.json)

The gesture state machine passed deterministic landmark tests for advance, reverse, stationary hold, reordered detection, partial hand loss, calibration direction, panorama single-fist controls and pointer/pinch. The local preview exercised the engine with a simulated camera and recognizer. Physical webcam acceptance, Edge and hosted Supabase performance remain open. [Simulated camera results](qa/task-16/camera-simulation.json)

No authorized Supabase publishing secret was available, and the workspace network returned 403 for public Supabase requests. GitHub identifies the existing Vercel project under `elavukatoo-7058s-projects`. The Vercel connection returned 403 for that scope and could not generate a team consent link. The asset prefix has not been published. There is no verified hosted library preview or production deployment.

## Reproduce and publish

You need FFmpeg/FFprobe, Pillow and NumPy. Keep the media package outside the repository. In the commands below, set `library_source` to the approved upload, `original_cover` to the verified original `frames/01-AD/f_0000.webp` and `library_package` to a fresh work directory.

```sh
python3 scripts/media/prepare_school_library.py inspect \
  --source "$library_source" --cover "$original_cover" --output "$library_package/inspection"
python3 scripts/media/prepare_school_library.py encode \
  --source "$library_source" --cover "$original_cover" --output "$library_package" \
  --fps 24 --duplicate-phase 1 --boundaries 458 718 --seam-end 1347 --seam-blend-start 1334
python3 scripts/media/publish_supabase.py --root "$library_package"
```

For hosted delivery, inject an authorized `SUPABASE_SECRET_KEY` or service-role key into the server-side process through a secret manager. The publisher targets the existing `seven-emirates-game` public bucket and refuses library publication to another project or bucket. It verifies each public WebP response before publishing and verifying the JSON manifest.

```sh
python3 scripts/media/publish_supabase.py --root "$library_package" --apply \
  --checkpoint "$library_package/publish-checkpoint.json" \
  --report "$library_package/publish-report.json"
```

In the existing Vercel project, set the public `VITE_LIBRARY_MEDIA_VERSION` and `VITE_LIBRARY_MANIFEST_SHA256` from the verified publication report for the feature-branch preview. The default asset base is the approved Supabase bucket. The build refuses incomplete or malformed release pins. Confirm the published preview with a physical webcam in Chrome and Edge, check hosted delivery and verify the existing authenticated education flows before setting the same public pins for Production and merging against the then-current `main`.

For a local browser run, start the frontend with the package version and manifest SHA. Use `scripts/qa-library-intro.py --library "$library_package" --book "$book_package" --report "$qa_report"` to replay the local packages through Chromium with a deliberately delayed seam response. This browser check uses guest API fixtures.

## Rollback

Before release, record the deployment currently attached to the production domain. The Git rollback commit is `d1babc0cd0be04569a9b619edc5c7a6d79d8db39`. Its successful GitHub Vercel check points to [the existing project's deployment dashboard](https://vercel.com/elavukatoo-7058s-projects/tomorrows-earth-expo/HBbT9kTB2eFWgK9SoFzeo7L7Vzz9). The owner should confirm that deployment against the domain before using it as a Vercel rollback target.

For an emergency after release, use Vercel Instant Rollback to the pre-release deployment in that same project. Remove both library environment pins and rebuild to restore the book-only entry. Revert the feature merge on GitHub if a code rollback is needed. The immutable library prefix can remain available for investigation.
