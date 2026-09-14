# CAGE final fix — one scoped re-review

## Original brush-expression finding: ADDRESSED

Inspected the fresh original, changed and policy PNG proofs against the actual approved reference. SangSangRock supplies materially wider, sharper and more angular strokes than the prior East Sea version. The changed-title and policy proofs now read as forceful brush headlines, so the specific finding that the implementation only roughened a gentle handwritten silhouette is addressed.

This is a stronger dynamic interpretation, not an exact recreation. The reference still has longer tapered dry-brush sweeps, greater stroke-pressure variation and a more vertically expansive second line. Cairo proof PNGs do not settle production luminance grain, displacement or shadow appearance. The 23 passing functional tests are not evidence of exact visual fidelity.

## New important defect in this fix: saved manual layouts can silently change

`src/core/cage-title-layout.js` now validates against substantially wider Rock metrics while retaining the minimum font size of 84. A layout accepted before this wave may now throw `CAGE_TITLE_TOO_LONG`. `cageTitleGeometry()` catches that failure and returns null; `renderCageBanner()` then uses automatic splitting instead of the saved manual break. Thus an existing saved one-line headline can turn into two lines without an administrator changing its setting.

Concrete reproduction, using the exact pre-wave source and metrics under `qa160/final-fix-before`:

```json
{"title":"국민의 내일을 위한 새로운 정치의 시작","breakAt":0,"emphasis":"equal"}
```

Before: accepted; computed font size 102.09274811743525. After: `CAGE_TITLE_TOO_LONG`; `cageTitleGeometry(title, layout)` returns null. This is a geometry behavior check, not browser rendering. The fallback path is directly visible in the shared renderer, so both homepage and editor preview are affected. This contradicts preserving existing administrator break/emphasis choices.

Action: retain the saved break/emphasis even when the new face requires a smaller size or narrower fit, or provide an explicit compatible rendering policy for layouts valid under the preceding font. Do not silently discard a stored valid layout. Add a focused regression for the exact saved example above.

## Scoped quality assessment and limits

The new font family and exact Rock-first/East Sea-second metrics agree with the renderer's family order. The new stylesheet is linked late in index.html. The diff preserves escaping, template/CTA isolation and the shared editor/home rendering path. No other important fix-only defect found. The added 3.3 MB font and unverified browser loading/grain behavior are documented in the fix report. Font binaries are not transformed by the source changes.

Scope: read final fix report and diff, inspected selected numeric metric changes and all four supplied images, and ran the targeted pre/post manual-layout reproduction. Did not rerun the full suite, open a browser/server/port, mutate production source or repeat broader release review. This is the requested single re-review. Overall fix quality remains NEEDS CHANGES because of saved-layout compatibility, while the original brush-expression finding is addressed.
