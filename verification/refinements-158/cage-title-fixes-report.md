# JCS 158 cage title fixes

## Changes

- `validateCageTitleLayout()` now accepts a nonzero break only when it is one of `cageBreakOptions()`'s choices. Spaced titles therefore break only at whitespace boundaries, while titles without whitespace retain deliberate Unicode codepoint positions.
- `featureCage()` resolves one target for both featured-cage and title-layout changes. An explicit featured id must match `titleLayout.cageId`; an empty featured id resolves the newest published, undeleted cage root by `createdAt`, matching the homepage/editor selection rule. A stale or mismatched auto target fails with `CAGE_TITLE_CHANGED`, including after a CAS retry discovers a newer cage.
- Changing either title break or emphasis in the editor automatically checks the manual-layout box before validation and preview rendering.
- The whitespace report was reproduced and found to be a false positive: `fields()` already normalizes `record.title`, and stored layout titles are normalized at persistence. A regression test documents that whitespace-only source edits restore the saved layout.
- A regression test confirms an untouched editor with no manual layout continues to render the approved original artwork.

## Tests

Command:

```text
node --test tests/cage-title-layout.test.js tests/cage-title-storage.test.js tests/cage-title-editor.test.js tests/home-promos.test.js
```

Result: **20 passed, 0 failed**.

Coverage includes spaced-title mid-word rejection, no-space codepoint choices, explicit target mismatch, newest automatic target, a concurrent newer cage introduced during CAS retry, stale-title and authorization rejection, layout clearing, whitespace normalization, editor control activation, original-art defaulting, geometry bounds, and focused homepage promo behavior.
