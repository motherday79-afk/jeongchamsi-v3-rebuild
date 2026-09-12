# 31.150 Publisher share and comparison impact

> Execute with superpowers:subagent-driven-development. User approved both changes in this conversation; use the existing canonical non-git directory and deliver PATCH/FULL ZIPs. No checkout or deployment.

**Goal:** Add a coverage-share comparison inside the selected publisher section, and replace the main comparison entrance with a falling, fractured-ground impact followed by a two-sided energy collision and emerging VS.

**Spec:** User-approved conversation: extend the existing media feature, not a fourth standalone feature; each selected politician drops from above, fractures the ground on landing; only after both have landed does energy collide and VS emerge. Existing stage height, purple/gold, empty initial selection, + picker, responsive mobile, and immediate interaction remain.

## Task 1 — Publisher share comparison

Files: new lib/publisher-share.js, src/views/publisher-share-view.js, tests/publisher-share.test.js, tests/publisher-share-view.test.js; modify lib/media-spread.js, src/views/media-spread-view.js, css/jcs-spread.css.

- [x] Write failing tests via analyzeMediaIndex for selected publisher excluded from the baseline (20/100 vs 10/200 = 20% vs 5%, 4x, +15 percentage points), rolling 7/30 days, article deduplication, multi-person/party deduplication, unknown publisher exclusion, zero baseline, tiny samples, no target/one outlet.
- [x] Implement analyzePublisherShare(rows, people, {publisher,targetIds,targetName,targetKind}) using the already deduplicated period-filtered media index. Both denominators contain articles in the same indexed politician population. Baseline pools all other known publishers; do not call it an average outlet. One article mentioning multiple target people counts once.
- [x] Return selected target comparison first, up to three greater/lower-share people, counts/denominators, source counts, and bounded evidence with safe HTTP(S) links. Ranking by percentage-point difference, not unbounded ratios. Expose ratio only if each denominator >=20 and target count >=5 on BOTH sides. For low samples show actual percentages/counts and a compact sample note; do not declare significance. Zero baseline has no ratio.
- [x] Render '보도 비중의 차이' INSIDE 'OO언론의 시선', with two comparison bars, exact fractions, purple/gold, expandable basis/evidence. No support/bias/intention claims. Label other sources as '다른 언론 합산'; disclose collected registered-politician coverage, not all political journalism, and possible missing/limited collection. Hide if no valid target or no comparison denominator. Peer routes preserve publisher and period. Do not change monthly attention or news attribution.
- [x] Run focused service/data/view tests; report exact command/results.

## Task 2 — Main comparison landing sequence

Files: src/ui/interactions.js, src/layout/home-layout.js if needed, css/hotfix-31-36-main-shell-footer.css; new src/ui/compare-motion.js and tests/home-compare-motion.test.js as appropriate.

- [x] Write meaningful tests for motion order, single-side vs both-landed sequence, rapid/repeated selections, clearing/replacement canceling obsolete collisions, reduced motion, and absent animation APIs. Use boundary doubles only where DOM/WAAPI unavailable.
- [x] Replace the old sideways/spot/streak effect and its unused CSS. Keep a single motion implementation. Use isolated decorative SVG/CSS layers (no raster dependency), diagonal downward entry from above, accelerating descent, hard landing/small recoil, angular cracks spreading, bounded debris/shockwave, then settling. Give each side independent landing state and effects.
- [x] Both selected is not enough: wait for BOTH current selected entrants to land before converging purple/gold energy, localized collision burst, VS rising/overshooting into rest. Aim for ~1.2–1.6s per arrival, followed by ~0.9–1.2s collision/reveal; do not block submit/input. Neither an initial nor one-sided VS reveal. Support choosing right first, quickly choosing both, replacing one mid-animation, and leaving the page. Clean up finished animations/timers and detached effects.
- [x] Keep main stage height 252px; render effects within the stage, without clipping autocomplete menus. Mobile keeps readable names and functioning +/change/search controls. Decorative overlays pointer-events:none; no global screen shake, audio, or rapid flashes. Reduced-motion users get stable selected state and VS once ready.
- [x] Run focused interaction/home route tests; report exact command/results. Browser executable currently absent: never claim device or visual browser validation if not actually run.

## Task 3 — Review and release

- [x] Review the complete diff against 31.149; fix concrete findings and run affected tests.
- [x] Increment release to 31.150, update changed CSS/JS cache versions transitively, include new runtime and test files in the delivery manifest.
- [x] Verify node syntax, static delivered imports, ZIP integrity, and byte-identical PATCH-over-149 versus FULL150.
- [x] Save both ZIPs and provide links with accurate validation limitations.

Completion evidence: qa150 reports; final related test suite 144/144; legacy baseline failures unchanged at12; packaging20 PATCH/156 FULL. Static SVG geometry and responsive cascade inspection only, no actual browser/device validation.
