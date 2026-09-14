# Independent integration review — JCS 0.0.31.159

Reviewed the complete release159-review.diff, implementation plan and task brief, support report and integration fixes, current model/service/editor/renderer/navigation/brand source, and supplied 224-pass test evidence. Source was read-only. No full-suite rerun, browser, renderer, ports, live storage writes, or deployment.

## Verdicts

- Task 1 specification: **CHANGES REQUIRED** — real published funding does not survive the stored-index-to-public-list path (finding R1).
- Task 1 quality: **CHANGES REQUIRED** — existing unit projection tests miss the actual persisted summary hydration boundary. Other reviewed support validation, private/unverified filtering, real editable fields, explicit clearing/legacy omission, demo canonicalization, account completeness, zero/null and over-goal rendering are sound.
- Task 2 specification: **PASS (static review)** — exact featured `이야기를 / 만나보세요` and card `이야기 / 만나보기` spans; each line cannot wrap; actual `jcs-icon` bounded to 15px; primary campaign replaces generation and generation appears in More; central header/search/footer/loading brand renderer and metadata use supplied PNG with contain/no-filter styling.
- Task 2 quality: **PASS (static review)** — limited changes, existing route and icon mechanisms preserved. Parent owns final original-image byte comparison.
- Broad integration: **CHANGES REQUIRED** pending R1. Browser visual/click validation remains explicitly unavailable; the CSS evidence is static only.

## R1 — Important: real campaign funding disappears from featured/cards

Locations: `src/core/campaign-model.js:87–90`; `lib/campaign-service.js` list/save index boundary.

`campaignSummary(record, now, true)` creates the persisted index summary using `card()`. For real funding, `card()` retains only goal/raised/count/asOf and discards public/sourceUrl. `service.list()` reads those persisted summaries and passes them through `campaignSummary()` again. `publicCampaign()` then deletes that funding because public/sourceUrl are absent. Canonical example hydration masks the failure for all five DEMOs.

Independent local reproduction using the production model:

```js
const index = campaignSummary(realPublishedRecord, now, true);
// index.published.funding = {goalKrw:100, raisedKrw:125, supporterCount:2, asOf:'2026-09-14'}
campaignSummary(index, now).funding; // undefined
```

Impact: real current campaign details display funding, but their featured/grid cards cannot display the requested compact progress. No private-information leak was found.

Required correction: retain enough authorized funding metadata in the private stored index or distinguish its trusted compact representation without weakening the public privacy gate. Add a service publish→stored index→list test for a real campaign, including known zero, missing count, private funding exclusion and no source/account details in the public list.

## Archive investigation

The parent's new Lua gate expects archived public DTO support to be absent. Current code correctly marks the record archive and retains previously public/verified recipient metadata in the DTO; the renderer removes account, copying, QR and official donation actions and preserves funding. This is not a state-transition defect. The documented brief prohibits archived donation actions but does not explicitly forbid archival public recipient metadata. Treat complete DTO support removal as a clarified stricter contract or optional hardening, rather than a second proven failure of the written spec. No private support/funding exposure was found.

## README

The README accurately describes manual sourced snapshots, inert fictional examples, admin edit restrictions, no payment processing, and browser/deployment limits. Its compact-progress feature is incomplete until R1 is fixed. Claims about preserved binary assets and exact PATCH/FULL equivalence depend on the parent's final packaging checks. Its two-line/layout statements are supported statically, not by browser verification.

## Final scoped re-review — R1 resolved

Reviewed the 40-line `review-fix159.diff` and the reported expected RED followed by 29 focused passing tests. `indexCard()` now retains funding eligibility metadata only within the private index. The unchanged public projection revalidates that metadata and removes source/public from compact list output. The new service test exercises serialized index reads for real featured/general/archive campaigns, known zero, missing count, private exclusion and absence of source/account data.

Independent production-model execution after the fix confirmed a JSON-serialized internal summary survives the second public projection, preserves raised=0 and count=null, strips sourceUrl/public, and excludes funding when its stored public flag is false. No fix-induced important defect was found. The full suite was not rerun for this bounded review.

**Final verdicts (supersede the initial verdicts above):**

- Task 1 specification: **PASS**.
- Task 1 quality: **PASS**.
- Task 2 specification and quality: **PASS (static review)**, unchanged.
- Broad integration: **PASS for reviewed source and behavioral evidence**. No unresolved critical or important findings. Final immutable-asset/package equivalence and the production-Lua gate remain the parent's delivery checks; browser visual/click QA remains unavailable.

The archive assertion clarification is settled: historical public metadata may remain, funding is preserved, and donation execution is disabled. No archive DTO removal is required. The README's reported feature behavior is now consistent with the corrected source.
