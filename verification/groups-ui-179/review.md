# Release 179 independent review

Status: PASS for source/specification review after fixes. No unresolved blocking findings. Actual browser visual verification was unavailable; final packaged/full-regression acceptance belongs to the root verification report.

Scope: supplied 178-to-179 diff and current group views, interaction handlers, CSS, model and tests; focused integration review of activity request IDs, reward hints, media URLs and authorization. No browser visual review was performed. No production files changed by this reviewer.

## Findings recorded during review

1. **P1 — Clearing an existing optional event end time does not clear it.** `src/ui/group-interactions.js:27` omitted `endsAt` when the input was blank. The model deliberately treats omitted input as preserve-existing, so users could not remove a saved end time. Direct Node/FormData reproduction returned `endsAtPresent:false` for an edit containing `endsAt:''`. `tests/groups-ui-179.test.js` initially asserted this incorrect omission. Fix must distinguish a missing field from a present blank field and test the complete edit behavior.
2. **P2 — Gallery details are constrained to thumbnail-column width.** `src/views/group-pages.js:41` placed the detail inside a block-level `details`, nested in a grid-item `figure`. `css/groups-171.css:15` applied `grid-column:1/-1` to the inner detail, which is not a child of the grid. Opening a photo therefore did not provide a broad photo/detail area; comments and edit forms were also squeezed. Root independently identified this and assigned the fix.
3. **P3 — Edit forms have no explicit Cancel control.** `src/views/group-pages.js:33,39` conditionally omitted the Cancel button during edits. Native disclosure summaries can close them, but an explicit control aligns editing with the requested composer flow. Root assigned this alignment.

Root separately flagged desktop composer flex layout and missing empty states and is coordinating those fixes. Packaging cache-bust updates were pending during the initial review.

## Spec assessment, initial pass

The direct directory link is placed before the cover and is present for all valid group-detail tabs, restricted membership and example states. Posts and gallery content are separated; notices sort before other posts; events sort chronologically using normalized stored ISO dates. Gallery creation starts with upload; event creation/edit share title, start/end, location and description fields. Cover upload timing and format/size guidance are present. Responsive source rules exist, but visual adequacy is unverified without a browser. Initial findings above prevent final acceptance until re-reviewed.

## Security and regression assessment

No new security defect found in the reviewed changes. User-supplied text/attributes remain escaped. Media URLs retain the existing allowlist and server-backed endpoint. Backend media authorization was not changed. Event mutation still requires active write permission and manager status; optional end-time projection remains under `viewer.canRead`. Example views strip mutation privileges and per-item controls. New/edit post and comment reward eligibility, request-key hooks, unchanged 178 reward integration, conflict acknowledgement and optimistic version handling remain present.

Optional end-time model semantics are backward compatible: absent preserves, empty clears, normalized end-before-start rejects. Parent reports 35 backend tests green; that result is not an independently rerun test claim from this reviewer.

## Re-review checkpoint

The first three findings are resolved in current source: explicit blank end-time serialization, full-row expansion on the actual figure grid item, and edit Cancel buttons. Direct Node assertions independently confirmed that a present blank end produces `endsAt:''`, while a missing field stays omitted. Cache-bust references for group routing/view imports, interactions and index CSS now use 179.

Two related **P2 layout integration** issues were identified during re-review and sent to the root for correction: the new grid composer rule only applied to create panels, leaving edit panels with the previous flex layout (`src/views/group-pages.js:35,40`, `css/groups-171.css:15`); and the start/end container lacked a full-width grid span inside the two-column composer, including on mobile where the outer two-column rule still won by specificity (`css/groups-171.css:15-16`). Root agrees and is applying shared create/edit form selectors, explicit mobile columns and the date container span. Root is also constraining the expanded gallery summary thumbnail to avoid displaying a very large duplicate image above the full image.


## Final re-review and verdict

**Specification: PASS. Quality/security integration: PASS, with the visual-verification limitation below.**

All reported findings were corrected and re-read in the final source. Shared `[data-group-post-form]` and `[data-group-event-form]` selectors now style create and edit forms consistently. The event date container spans both desktop columns. The mobile selector uses matching specificity and overrides both forms to one column. Gallery expansion targets the actual figure grid item, the open summary thumbnail is capped at 240px, and the full image overrides the thumbnail aspect ratio while retaining containment. Explicit edit Cancel controls, informative empty states and the end-time serialization correction are present.

No unresolved important functional or security finding remains in this reviewed scope. Media authorization and mutation privileges remain server-enforced, and the 178 reward/concurrency hooks remain intact. The 179 cache references were inspected for index CSS, app interactions, group routing and search-discovery view import.

Evidence independently executed by this reviewer: direct Node/FormData assertions for blank versus absent optional end time, plus source/diff inspection of the final CSS, view structure, permissions and reward hooks. The UI implementer reports final focused 35/35 tests passing and its earlier full run 473/473; the root is performing the final fresh full regression and packaging verification. This review does not substitute those root results. No browser was used, so this verdict does not assert pixel-level desktop/mobile rendering or live-site behavior.
