# JCS 158 CAMPAIGN review

## Verdicts

- **Specification compliance: NEEDS FIX**
- **Code quality: NEEDS FIX**

The category model, five complete fictional records, server-owned example markers, public projections, durable hidden overrides, absent-value CAS, official-number exclusion, politics-only autocomplete guard, support exclusion, and approved WEBP byte equality are implemented correctly. The remaining issues are in approved presentation preservation and category routing.

## Findings

### [P1] Featured example no longer uses the approved featured portrait

`src/data/campaign-examples.js:2-4` assigns `example-001` (the bundled featured record) the `atlas-tl` crop from `approved-campaign-0.webp`; the approved standalone portrait `approved-campaign-1.webp` is assigned only to non-featured `example-005`. Although both destination files are byte-identical to the supplied approved assets (verified SHA-256), the visible featured composition has changed from the approved portrait to an atlas crop. This violates the requirement to preserve the approved layout/visual while recovering the approved prototype photographs. Restore the approved standalone portrait to the featured record, then assign the remaining atlas crops among the four cards as intended.

### [P1] Inline crop SVGs participate in layout where legacy images were absolutely positioned

`css/campaigns-158.css:9` gives crop SVGs `width/height:100%`, but legacy hero images are removed from layout with `position:absolute` in `css/campaigns-157.css:28,121`. The desktop feature and detail photo grid tracks have no explicit height; an inline SVG has an intrinsic 3:2 ratio and therefore contributes a size where the previous image did not, so it can change the approved hero height/track sizing. The editor regression is definite as well: `css/campaign-editor-157.css` limits preview `img` to 180×220, while `css/campaign-editor-158.css:5` makes a crop SVG span the full preview width. Preserve the crop viewport but apply the same positioning/sizing contract as the replaced image in each surface (absolute fill for feature/detail, bounded preview sizing in the editor). Grid cards can continue to fill their existing 3:2 portrait container.

### [P1] Archive invitation drops the active category

`src/views/campaign-pages.js:60` always links the archive invitation to `/campaigns?view=archive`. From a filtered current view such as `?category=culture`, following this view-change link silently resets the global catalog to all categories. The tabs and pagination correctly retain the category, but this second archive route does not, so the accepted “category survives view changes and pagination” behavior is incomplete. Build this link from the selected category, as the archive tab already does, and cover this conditional link with a focused rendering assertion.

## Review scope and evidence

Reviewed the supplied diff against Task 3 and accepted steering, including model normalization/projections, service read/write and virtual-example CAS behavior, HTTP/client/routing filters, editor submission metadata boundaries, autocomplete late-selection guards, detail support gating, CSS interaction with the retained 157 layout, and asset hashes. Per instruction, I did not rerun the implementer's test suite and did not use a browser.

## Round 2 disposition

- **Specification compliance: PASS**
- **Code quality: PASS**

All three findings are resolved in `release158-review.diff`:

1. **Featured portrait — resolved.** `example-001` now uses the standalone `approved-campaign-1.webp`; examples 002–005 map in order to the TL/TR/BL/BR crops of `approved-campaign-0.webp`. This restores the approved featured composition while retaining all five examples.
2. **SVG sizing — resolved.** Feature and detail crops are absolute-fill children, matching the retained 157 image layout contract; card crops fill the existing positioned 3:2 wrapper; editor crops are bounded to the prior 180×220 preview envelope with the existing radius. The selectors are scoped to their campaign surfaces.
3. **Filtered archive route — resolved.** The archive invitation now appends the active category and has a focused rendering regression assertion.

I found no important regression induced by these fixes. I inspected the new focused assertions and current diff without rerunning the already-covered test suite. The separately reported stale HTTP expected-argument failure is test-only and outside these implementation dispositions.
