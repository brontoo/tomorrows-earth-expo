# Seven Emirates supplied sequence and inactive player integration

## Scope and source

Phase 1 is preserved in commit `5cd8586afa87af32533f8df20c581315c4e27b2b`
on `integration/seven-emirates-frame-engine`. The user subsequently supplied
`https://github.com/brontoo/7E-Book` and approved integrating its player behind
the inactive flag. The inspected source commit is
`1bc718ef5e770033a3f00f398223abce01052fb1`.

That repository provides 1,673 real Full HD WebP frames, the standalone JS
player, gesture modules, an upstream QA report and README. No original MP4s or
lossless reference images are present. Its README explicitly describes the
frames as lossy WebP derivatives. No lossless extraction or original-video
FFprobe verification is claimed. The earlier ZIP remains inaccessible through
the upload tool's 32 MiB transfer limit.

The canvas/drag interaction from `app.js` has been adapted into a React chapter
surface. The standalone page, global DOM listeners, automatic eased chapter
navigation, unrestricted chapter access and camera runtime are not embedded.
All vehicles and architectural motion remain within the supplied frame imagery.

## Measured export inventory

All 1,673 images fully decoded at 1920×1080. FFprobe samples from all seven
folders identify WebP/yuv420p; the preparation report records the observed VP8
chunks. There are no duplicate file hashes or decoded RGB hashes, missing local
indices, or missing copied frame references. Total measured frame bytes:
263,968,706 (approximately 251.74 MiB). Preparation inserts/removes zero frames.

| Folder / chapter | Frames | Global range `[start, end)` | First | Last/rest |
| --- | ---: | --- | ---: | ---: |
| 01-AD / Abu Dhabi | 239 | [0, 239) | 0 | 238 |
| 02-DXB / Dubai | 239 | [239, 478) | 239 | 477 |
| 03-SHJ / Sharjah | 239 | [478, 717) | 478 | 716 |
| 04-AJ / Ajman | 239 | [717, 956) | 717 | 955 |
| 05-UMQ / Umm Al Quwain | 239 | [956, 1195) | 956 | 1194 |
| 06-RAK / Ras Al Khaimah | 239 | [1195, 1434) | 1195 | 1433 |
| 07-FUJ / Fujairah | 239 | [1434, 1673) | 1434 | 1672 |

The upstream report states 24 fps. At that reported rate, each clip corresponds
to 9.958333 seconds and the sequence to 69.708333 seconds. Manifest timestamps
are derived as local index / reported fps; they are not measured original PTS.
Original video encoding, duration, variable-rate behavior, skipped/inserted
frames during upstream extraction and original pixel fidelity remain
unverifiable without the original videos. No upscaling or re-encoding was done.
Last supplied clip frames are the resting positions used by the standalone
player, not independently inferred landmarks.

## Six transition checks

First/middle/last images and all six adjacent last/first pairs were visually
inspected in the generated contact sheets. Each later clip begins on the
previous Emirate's spread before turning toward its named Emirate. This is
source animation content and has been preserved.

All six boundaries show matching scene layouts with small camera/object/encoding
differences. None is pixel-identical. Static contact-sheet inspection found no
obvious wrong-order cut; this does not prove original-video extraction fidelity.

| Boundary | Frame pair | Mean absolute RGB difference, 0–255 |
| --- | --- | ---: |
| Abu Dhabi → Dubai | 238 / 239 | 3.083 |
| Dubai → Sharjah | 477 / 478 | 3.681 |
| Sharjah → Ajman | 716 / 717 | 4.370 |
| Ajman → Umm Al Quwain | 955 / 956 | 3.395 |
| Umm Al Quwain → Ras Al Khaimah | 1194 / 1195 | 3.553 |
| Ras Al Khaimah → Fujairah | 1433 / 1434 | 4.144 |

## Reproduction and output

Preparation requires Python and Pillow (validated with Pillow 13.0.0):

```sh
python scripts/media/prepare_seven_emirates.py \
  --source-project /workspace/7E-Book \
  --output /workspace/media/seven-emirates/prepared
```

The source checkout must be clean. The script rejects output inside either
checkout, refuses unrelated nonempty output directories, validates every frame,
copies original WebP bytes, checks destination SHA-256 hashes, and generates:

```text
/workspace/media/seven-emirates/prepared/
  manifest.json
  qa.json
  chapters-contact.jpg
  boundaries-contact.jpg
  frames/01-AD/f_0000.webp ... frames/07-FUJ/f_0238.webp
```

Repeated preparation produced an identical manifest and verified every copied
hash. The manifest, report and two small contact sheets are retained under
`media/seven-emirates/` in the application repository. Frame files remain outside
it. Contact sheets alone are downscaled QA previews. Relative frame asset keys
are used; no hosted URLs or storage credentials were fabricated.

## Inactive integration and local validation

With no configuration changes, `legacy` remains active and makes no frame-media
requests. To test locally in a separate process:

```sh
python scripts/media/serve_prepared.py \
  --root /workspace/media/seven-emirates/prepared --port 4180

VITE_BOOK_ENGINE=frames \
VITE_BOOK_ASSET_BASE_URL=http://127.0.0.1:4180/ \
PORT=3002 corepack pnpm dev
```

Set `COREPACK_HOME=/workspace/.cache/corepack` in this environment when invoking
Corepack. The media server binds only to loopback and sends CORS headers for
public frame imagery. This is a local test server, not external hosting.

Both flags are build-time Vite settings in a production build. No environment
file, production setting, storage service or deployment has been changed.
An absent/invalid manifest or failed first-image verification retains legacy.
Later frame failures retain the last valid image and offer retry or legacy
recovery. Frame requests omit credentials and validate byte size, SHA-256 and
decoded native dimensions before drawing.

The initial integration uses the new player for chapter imagery while retaining
existing cover, contents, collection and final-spread presentation. The current
mission links and server-owned stamps remain in the educational shell. All
input respects ranges supplied by that shell, permits forward/reverse traversal
of adjacent unlocked chapters, and cannot jump a locked gap. Explicit chapter
navigation still permits earned revisits. A successful frame load grants no
points or stamps. Input pauses during existing busy presentation transitions.

Mouse, touch, one-frame keyboard stepping, slider navigation and reduced motion
work without a camera. There is no autoplay clock. Decoded image caching is
limited to eight Full HD bitmaps (about 63 MiB); only the requested frame is
loaded, without whole-sequence decoding or speculative locked-chapter loading.
Prefetch tuning and slow-network performance remain future work.

## Validation and remaining work

`scripts/qa-frame-book.py` exercises actual imagery, decoding, canvas rendering,
mouse/touch/keyboard controls, chapter locks, bidirectional chapter-boundary
navigation, all seven chapter resting frames, reduced motion/mobile layout,
integrity rejection and legacy recovery. Auth and educational API responses are
explicit fixtures. It neither requests a camera nor validates real reward
transactions. `scripts/qa-book.py` remains the default legacy regression harness.

The supplied repository's 13 gesture-logic unit tests pass, but gesture code has
not been integrated or hardware-tested. Projects, authentication, dashboards,
backend procedures, mission bindings, schema and dependencies are unchanged.

Final validation results:

| Check | Result |
| --- | --- |
| Default `pnpm build` | Passed; existing large-chunk warnings only |
| Build with `VITE_BOOK_ENGINE=frames` and local asset base | Passed |
| `pnpm check` | Same six pre-existing diagnostics; no new diagnostics |
| `pnpm test --maxWorkers=2 --minWorkers=1` | 101 passed, 3 unchanged baseline failures; all 20 added media tests passed |
| Default legacy browser harness | 14 checks passed; zero page errors |
| New frame-player browser harness, development and production build | 8 checks passed in each; zero page errors |
| Repeated media preparation | Identical manifest; every copied SHA-256 verified |
| Built application media inspection | Zero `f_*.webp` sequence images in `dist` |

The six TypeScript diagnostics remain the missing MediaPipe package,
AdminDashboard votes/voteCount mismatch, missing EcoGuide API and untyped
callback, nullable SDK argument and seed transaction type. The three baseline
test failures remain two expired-deadline assumptions and the missing approved
teacher fixture. They were not suppressed or fixed within this integration.

Next: recover original videos/lossless references to finish provenance QA, review
this inactive integration, then select external media hosting and measure cold
loading/cache performance before separately authorizing activation and gestures.
