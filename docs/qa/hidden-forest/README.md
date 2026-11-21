# Hidden Forest browser evidence

The browser test builds on the production library and book manifests. It replays verified local copies of the book frames and uses fixture guest tRPC responses. The forest renders in actual Chromium WebGL through the SwiftShader software renderer. The mobile scenario uses a touch-enabled viewport.

| View | Screenshot |
| --- | --- |
| Forest Canopy | [canopy.jpg](canopy.jpg) |
| Beneath the Surface | [underwater.jpg](underwater.jpg) |
| Root Labyrinth | [roots.jpg](roots.jpg) |
| Carbon Vault | [carbon.jpg](carbon.jpg) |
| Living Atlas and seal | [atlas.jpg](atlas.jpg) |
| Tidal World on mobile | [mobile-tides.jpg](mobile-tides.jpg) |

[Browser measurements](browser-report.json) include frame time, draw calls, triangles, render pixel ratio and an approximate Chromium JavaScript heap sample. Heap bytes are page-wide and exclude GPU allocation. WebGL context releases were checked across three entries. Field measurements on school hardware remain open.

In the recorded run, the desktop viewport averaged 162.5 ms per rendered canopy frame, and the touch viewport averaged 63.0 ms. The first desktop draw completed about 1.24 seconds after entry. These are software-rendering samples. The desktop was at a 0.60 render pixel ratio and the touch viewport was at 0.90 for the reported samples.

The first model requests total 1.61 MB. The 5.40 MB hero tree and 3.70 MB supplementary roots model are deferred to inspection. The production forest JavaScript chunk was 106.14 kB (34.05 kB gzip) and the shared Three.js chunk was 614.67 kB (156.48 kB gzip). The QA run checked that forest-specific assets were absent before entry and that all four model files loaded on their respective paths.

Reproduce with a local production build and verified extracted media directories.

```sh
node scripts/build-book-production.mjs
npm run preview -- --host 127.0.0.1 --port 4298
```

In a second terminal with Python Playwright and Chromium installed, run the smoke test.

```sh
python scripts/qa-hidden-forest.py \
  --app http://127.0.0.1:4298 \
  --library /path/to/library-package \
  --book /path/to/book-package \
  --output /path/to/qa-results
npm test -- server/hiddenForest.test.ts
```
