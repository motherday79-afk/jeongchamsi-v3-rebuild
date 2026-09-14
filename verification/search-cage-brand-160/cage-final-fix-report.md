# CAGE consolidated final fix wave

Functional verification: 23 passed, 0 failed. Visual outcome: a materially broader and more angular dynamic brush silhouette than the East Sea attempt; the approved artist reference still has longer tapered dry-brush sweeps and more varied pressure than this font. Do not claim an identical match, or that automated tests settle the design-fidelity question.

## Actual change

Selected SangSangRock OTF (상상토끼 정묵바위) after comparing actual font outlines against East Sea Dokdo, official Asan Yi Sun Shin Bold and KCC Imkwontaek. Yi Sun Shin was smooth traditional calligraphy; Imkwontaek had rounded pen-like strokes. Rock supplies visibly broader strokes and sharper diagonal construction. Dynamic wording is rendered as actual text for all titles; there are no title-specific images or hardcoded changed-title substitutions.

The source now uses Rock followed by the existing East Sea fallback. Generated advance, x ink and y ink metrics from the exact two bundled font binaries, with Rock taking precedence for its 2643 supported codepoints. Other codepoints supported by East Sea receive its exact metrics. Characters unsupported by both still use the existing conservative estimates and platform cursive fallback; their browser ink is not proven by these calculations. A new regression verifies a normal Rock glyph and a rare Hangul fallback glyph against independently extracted bounds.

Forward skew is 22 degrees, width expansion caps at 1.35 and the outline is 2 units. Reduced outline weight preserves the font's own rough edges. Shared editor/home geometry, explicit manual break/emphasis, storage validation, text escaping, live votes and route selection are retained. Source-title truncation/automatic selection policy is unchanged in this fix wave. Original approved reference/template assets were not edited.

## License / payload

Unmodified 3.3 MB public distributor WOFF is included, without conversion or subsetting. SHA256: c3f288d4b30ae94b668fe13e7ce1ca7c7aee2b082ab56b2be8e19d83bd8c046f.

Authorized distributor original license: https://www.sandollcloud.com/free-font/825/SangSangRock-OTF . Permits commercial work, website embedding and redistribution; prohibits paid resale and modification of the font file. This is NOT OFL. The package includes assets/fonts/SangSangRock-LICENSE.txt with source, publisher, conditions and hash. The linked publisher page https://sangsangfont.com/21/?idx=122 returned 403 to web fetch; the accessible authorized distributor's full original license was used. Raw download: https://gcore.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/SangSangRockOTF.woff . No font binary was transformed.

## Verification

`node --test tests/cage-brush-rendering.test.js tests/cage-title-layout.test.js tests/cage-title-editor.test.js tests/cage-title-storage.test.js tests/home-promos.test.js` → 23 passed, 0 failed; output cage-final-fix-tests.txt.

`node qa160/cage-proof.mjs` then `python qa160/cage-proof.py` → three standalone production-SVG proofs for original, changed and policy titles, with exact font outlines and template embedded. Inspected all three PNGs and compared against actual assets/banners/cage-approved-156.webp. Results fit the title board and have stronger stroke mass, especially the changed and policy headline. The original reference still has a more vertically expansive second line and long tapered brush tails missing from the available dynamic font.

These are font-outline/CairoSVG illustrations, not browser screenshots. PNGs do not implement SVG turbulence/displacement/drop shadow/luminance grain exactly; SVGs retain production filters. No browser, server, port or site preview was used. Font loading/FOIT/FOUT and final browser grain appearance remain unverified.

## Integration

Parent must include css/cage-brush-160.css after existing home-promos CSS and version/cache it. Font metrics imports use the 160 query. Renderer names JCS Cage Rock first and existing JCS Cage Brush second; the original font-face remains untouched. Exact fallback metrics require those two font families in that order. New font adds about 3.3 MB uncompressed payload; font-display:swap retains readable fallback during loading.

Captured owned source before edits under qa160/final-fix-before; final-fix160.diff contains this wave's text changes and new font binary hash. No search/navigation/brand/app/index/release files were edited.

Changed files:
- tests/cage-brush-rendering.test.js
- src/data/cage-brush-metrics.js
- src/core/cage-title-layout.js
- src/ui/home-cage-banner.js
- css/cage-brush-160.css
- assets/fonts/SangSangRock-LICENSE.txt
- assets/fonts/SangSangRockOTF.woff
