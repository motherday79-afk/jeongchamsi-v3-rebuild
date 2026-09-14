# Search discovery, cage typography and logo sizing implementation plan

> Execute with superpowers:subagent-driven-development in this same preserved directory. User approved all proposed changes and ZIP delivery; no checkout/reset or renewed confirmation.

**Goal:** Append campaign and existing mini product discovery to integrated search, enlarge exact brand logos, and correct the inconsistent dynamic CAGE lettering.
**Architecture:** Keep current source159 as baseline. New discovery renderer uses existing public campaign repository and existing product identities/art/routes after complete search analysis; search results never wait on promotional data. Brand changes are scoped CSS. CAGE typography remains actual dynamic text using one verified font/lettering rendering pipeline and existing manual title geometry.
**Tech:** ESM JavaScript, CSS, existing SVG artwork, Node tests, Python font/asset inspection.
**Spec:** User approved assistant's prior proposal: analysis then3campaigns and4mini products; white background/purple-gold accents; products link to existing detail and retain launch-preview status. Current request: footer logo2x, header/search logo larger, no shape changes.

## Global constraints
- Source /workspace/scratch/b627f5328562/qa161/source-155, baseline ZIP JCS_0_0_31_159.zip. Target160. No checkout/reset, no deployment or live writes.
- Preserve badges, political data, five campaign contents/photos, all existing art including supplied gold logo PNG bytes. No right main CAMPAIGN ad integration. No new payment or commissions.
- Previous browser access was explicitly denied by policy; no browser/port/alternative browsing bypass. Static DOM/CSS/geometry/event verification is allowed. Standalone font geometry work is typography asset development, not browser rendering; do not claim actual browser QA.
- Maintain two-line campaign CTA and private funding handling added159.
- Do not add new design/merchandise identities. Existing KIDS_PRODUCTS keys/routes/images are canonical.

## Task1 — Search discovery and enlarged brand (worker)
Read qa160/task1-brief.md; owns search-page.js, new search-discovery renderer/UI/CSS, app route wiring, home-layout exports needed for product reuse, new brand160CSS, focused tests. Parent owns CAGE files, index/release/cache/package integration.
- [ ] Test campaign independent-loading failures, published current-only and limit3, exact section order, four existing product routes, no duplicate sections across refresh/navigation, race-safe mount cleanup.
- [ ] Append after full existing search result markup; don't splice into publisher/timeline details.
- [ ] Load campaign data independently so stalled/error promotions never delay search. Reuse existing campaign repository public list current, not direct private data. Preserve real public funding if showing compact data; generic current campaigns no query-based political endorsement.
- [ ] Render3campaigncards with existing image/crop/style identity and full-card links + overall link. Reuse existing product artwork/data via narrow exported helper. White backgrounds, purple/gold accents, no global CSS changes.
- [ ] Products heading small '정참시 쇼핑몰에 새로운 아이템이 추가되었습니다', large '작고 귀여운 별빛 친구들';4across PC,2x2 mobile, existing 출시 준비 중 state and item details.
- [ ] Footer logo48x48 (was24), header48x48 (was30), search44x44 (was30); scope CSS so effective cascade wins. Search anchor slot grows to50 if needed; input remains flexible with min-width0. Preserve raw PNG/object-fit:contain/no filters/no crop and existing page layout. Verify32rem/320px shell geometry.
- [ ] Focused tests and report qa160/task1-report.md. No full suite or subagents.

## Task2 — Dynamic cage lettering (parent)
- [ ] Inspect original reference and actual current letter pipeline. Current special case raster original only for one title; changed titles use EastSeaDokdo and much weaker brush shape.
- [ ] Compare actual letter contours/weight/spacing for approved title and two alternate titles, using existing geometry limits1015x282 in1774x887 artwork.
- [ ] Use locally available font sources first; if new brush font is necessary verify official source/redistribution license before bundling and regenerate advance/ink bounds from exact font. Do not change banner template/CTA/percent art. Never claim reproducing arbitrary unique raster glyphs exactly through a standard font.
- [ ] Preserve administrator explicit break and emphasis, dynamic saved title truth, Unicode escaping, newest title selection and shared editor/home preview function. Recalibrate font bounds and grouping to prevent clipping. Remove special handling only if one actual dynamic rendering pipeline sufficiently matches the approved expression; retain approved original art unmodified as reference.
- [ ] Focused title behavior and geometry tests; report concrete visual limits candidly, no browser claim.

## Task3 — Final gate and delivery
- [ ] Include160styles/cache/release, KoreanREADME. Generate diff from159 and independent spec+quality review for each task and integrated release.
- [ ] Full npm tests, changed module syntax/import/style links, logo exactbytes and effective dimensions, unchanged art/data, campaign after search analysis, accountprivacy regression.
- [ ] Package159FULL+160PATCH=160FULL; retainallbaselinefiles. Include verification. Save bothZIPs. No live deployment.
