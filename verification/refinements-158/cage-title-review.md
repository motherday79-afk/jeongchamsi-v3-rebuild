# JCS 0.0.31.158 cage title review

## Verdict

**Accepted after fixes.** The normal admin UI, CAS persistence, stale-title protection, responsive SVG presentation, approved-image fallback, and bounded geometry are coherent. The important validation gap and the smaller target-consistency gap identified in the first review are addressed. The whitespace-only finding was a review false positive and is retracted. The supplied focused run now reports 20 passed and 0 failed.

## Findings

### Important — the server accepts manual breaks that the editor never offers — **ADDRESSED**

The initial review found that `validateCageTitleLayout()` checked only that `breakAt` was an integer within the character length. For titles containing spaces, `cageBreakOptions()` offered only space positions, while the validator and `featureCage()` accepted every interior character index. A crafted request could therefore persist a split inside a word.

`validateCageTitleLayout()` now permits a nonzero break only when it appears in `cageBreakOptions(actual)`. Thus spaced titles accept only whitespace boundaries; no-space titles deliberately retain Unicode codepoint choices. Regression tests cover rejection of a spaced title's mid-word index and acceptance of a no-space title's codepoint option. **Status: ADDRESSED.**

### Minor — title-layout target is independent of the selected featured cage — **ADDRESSED**

`featureCage()` now resolves a single target. An explicit featured id must equal `titleLayout.cageId`; automatic selection resolves the newest eligible published, undeleted cage root using the same `createdAt` ordering as the homepage/editor. Because resolution occurs inside the CAS mutation callback, a retry after a concurrent newer cage appears rejects the stale target instead of applying its layout. Tests cover explicit mismatch, valid newest-auto selection, and the concurrent-newer retry. **Status: ADDRESSED.**

### Retracted — whitespace-only title edits

The earlier claim was incorrect. `fields()` first normalizes the current record title, and persisted layout titles are normalized by `validateCageTitleLayout()`, so `record.layout.title === title` already succeeds after whitespace-only source edits. The added reproduction test confirms that the editor restores the checked manual layout and normalized hidden source. **Status: FALSE POSITIVE / no code fix required.**

### Editor activation refinement — **ADDRESSED**

Changing either the break or emphasis select now checks the manual-layout checkbox before validation and live preview rendering. This makes an administrator's layout choice take effect immediately rather than requiring a separate checkbox action. The added editor test covers the event wiring. An untouched editor without a saved manual layout still uses the approved original artwork by default, also covered by a regression test. **Status: ADDRESSED.**

## Specification and quality review

- Manual layouts preserve the chosen character sequence and do not pass through the automatic truncation/splitting path. `cageTitleGeometry()` rejects stale or invalid layouts and `renderCageBanner()` falls back safely.
- First-line, second-line, and equal emphasis are represented as persisted enum values. The SVG viewBox makes the selected layout stable across device widths.
- The geometry uses the bundled font's measured advances and ink bounds. It centers the skewed text, limits width to 985 inside the requested `x=390, y=84, width=1015, height=282` clip, checks vertical bounds, and rejects layouts whose smallest line would fall below 84 px.
- The approved original title uses `/assets/banners/cage-approved-156.webp` only when no manual layout is active and its normalized title matches. The original asset itself is unchanged relative to 157. Other titles use the revised SVG gradient, displacement, stroke, and shadow.
- Admin preview changes are event-driven and produce the same `renderCageBanner()` markup as the homepage. Save flows through `auth.saveHomeCage` to the admin gateway and `featureCage()`'s Redis CAS retry loop. A stale source title returns `CAGE_TITLE_CHANGED` and cannot acquire the prior layout.
- CSS is compact and responsive. The pending index stylesheet/import wiring was excluded from this review as requested.

## Verification

Executed:

```text
node --test tests/cage-title-layout.test.js tests/cage-title-storage.test.js tests/home-promos.test.js
```

Initial result: **12 passed, 0 failed**.

The scoped fix report records this expanded run:

```text
node --test tests/cage-title-layout.test.js tests/cage-title-storage.test.js tests/cage-title-editor.test.js tests/home-promos.test.js
```

Fix result: **20 passed, 0 failed**. Per the re-review scope, this covered run was inspected rather than rerun. Browser execution was intentionally omitted; geometry, markup, event wiring, endpoint flow, and CAS behavior were inspected in code.
