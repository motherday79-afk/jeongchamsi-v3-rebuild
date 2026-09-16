# Activity points 178 — Task 2 and final integration review

## Current verdict after the single fix wave

**Task 2 specification: PASS. Task 2 quality / final integration review: PASS.** All four Important findings below are **ADDRESSED**. No Critical, Important or Minor finding remains from this review, and no new breakage was found in the scoped fix. Proceed with the planned archive/parity/delivery gates.

Scoped re-review inspected `qa178/final-fix.diff`, the appended frontend implementation report, focused regression code for the reported issues and the verification logs. No source changes, additional agents, browser, Redis, live calls or suite reruns were performed by this reviewer. The focused implementer log reports **59/59 passed**, zero failures/skips. Root's final `full-test.txt`, inspected after the fixes, reports **464/464 passed**, zero failures/skips, including the traced real gateway deployment-package test. These are inspected execution evidence, not tests independently rerun in this review.

- **Finding 1 — ADDRESSED.** Both actual new-post call sites now pass the group ID to `postForm`; comment forms pass their group/post target into `operation`. Account-scoped storage therefore receives distinct keys for separate groups and comment targets. Regression cases cover rendered keys, preservation of an unknown same-target token and isolation of completion cleanup.
- **Finding 2 — ADDRESSED.** Superseded hydration now returns without DOM writes. Per-mount ownership guards painting and identity-change cleanup, which clears only still-owned connected mounts and never restores captured private HTML. Deferred regression cases resolve the newer identity response before the older response and cover the no-successor identity switch.
- **Finding 3 — ADDRESSED.** The actual delegated kind-change handler toggles the hint mount's hidden state for notice versus post/gallery, preserving the hydrated policy for eligible kinds. The hidden wrapper has no overriding display rule; the added `.activity-hint[hidden]{display:none}` also ensures hidden activity components override their grid declaration. The bound-handler test covers notice → gallery → post behavior, with the CSS contract checked statically. No browser claim is made.
- **Finding 4 — ADDRESSED.** The common submit branch captures identity before awaiting the API; both ordinary delete branches now call `rememberSubmissionFeedback` with that captured identity and the current identity getter. The helper rejects different-account completion and stores accepted feedback under the submitting identity. Behavioral tests cover account-switch rejection and preservation of same-account recovered/debt amounts.

**Scoped new-breakage check:** no changed backend/payment/177 entitlement paths, no new dependencies, and no loss of edit/admin/example exclusion or same-target retry semantics found. The final source review is approved; archive byte parity and saving deliverables remain root's separate release responsibilities.

## Original assessment — review history, superseded by the PASS above

**Task 2 specification verdict: fixes required.** The main member and administrator flows are implemented, but target isolation, stale-result handling, notice guidance and late deletion feedback have the four concrete gaps below.

**Task 2 quality / final integration verdict: not release-ready until these Important findings are fixed.** No Critical finding. Existing Task 1 approval remains valid; no additional backend financial/CAS blocker was found in this integration pass. Packaging, byte parity and saving deliverables remain root release tasks, not feature gaps.

Reviewed the approved activity-points spec and plan, supplied 177→178 diff, backend and frontend reports, backend fix approval, and actual frontend caller wiring. Used the requesting-code-review template. Read-only except this report; no Git, subagents, browser, live calls, Redis or source changes. Root's fresh `full-test.txt` ends with **459 pass, 0 fail, 0 skipped**, including the traced real gateway deployment-package test. I inspected this evidence rather than rerunning the suite. Targeted in-memory reproductions below run production exported helpers and rendering; they do not claim browser execution.

## Strengths

- Actual community/itsme/cage/comment submit branches forward request IDs and consume the backend's item/comment receipts; group mutation envelopes carry request IDs and top-level receipts. The cage completion helper is wired into the actual successful branch before the common render, preserving direct-entry cleanup and feedback ordering.
- Admin policy payloads use strict boolean/numeric values; revocation uses eventId, restriction uses userId/hours and supports zero. Required reason fields, role-gated admin entry, suspicion qualification, member selection and paged history are present. Server authorization remains authoritative.
- Shared ledger presentation distinguishes gross earned, credited and debt offset, and excludes clawbacks from cumulative spending. Aggregate cascade reversal fields are consumed correctly for the normal same-account flow. Existing recharge, cage and 177 refresh/analysis flows remain connected.
- Activity-specific CSS is loaded last and mostly scoped. Static source review of app.css/product-system.css, point-panel and admin-member-points rules found no explicit legacy white heading/label override on the new administration cards: `.activity-admin` supplies dark inherited foreground, activity labels/inputs have explicit dark colors, and the existing member panel supplies a white background/dark foreground. The 720px activity grid collapse is present. This is source inspection, not a claim of visual/browser or pixel-overflow verification.

## Critical

None found.

## Important — single fix wave

### 1. Group pending request state is shared across distinct targets

**Locations:** `src/views/group-pages.js:6,33–34,49,57`; `src/ui/activity-points.js:23–27`; actual consumer `src/ui/group-interactions.js:41–42`.

All new group posts use `group:post:new`, regardless of group, and every comment form uses `group:comment`, regardless of group/post. Since pending or unknown outcomes deliberately reuse a stored token even when input differs, one unresolved submission supplies its token to a different form. Backend signatures include the group/post scope, so a previously committed first request causes `INVALID_REQUEST_ID` for the second. The second form then remains stuck on an unedited retry because the stored signature is already its own payload and the helper only rotates after an edit. A success from one concurrent form can also clear another form's shared pending state.

**Executed focused reproduction:** production `renderGroupDetail` emitted `["group:post:new","group:comment","group:comment"]` for a group with two posts; another group's post key was also `group:post:new`. `activityRequestId` plus `settleActivityRequest(...unknown)` reused the first comment token for the second post. Production `awardActivity`/`activityRetry` then returned `INVALID_REQUEST_ID`; an unchanged retry after marking the second rejected still returned the same token.

**Minimal fix:** pass the group ID into post/comment form generation and use account + group + operation + target-post identity for storage keys, with distinct keys for independent creation forms where necessary. Preserve the existing same-target unknown-outcome retry behavior. Scope cleanup to that same target.

**Regression test:** render two comment targets and two groups, submit one with an unresolved outcome, verify all other targets obtain distinct IDs, and verify retry of the original target preserves its ID. Cover independent completion/cleanup so one form cannot remove another's record. Files: group-pages.js and focused UI/group handler tests; no backend change needed.

### 2. Stale hint hydration overwrites a newer result with captured old HTML

**Location:** `src/ui/activity-points.js:64–71`, especially line 69.

The stale-sequence/changed-identity branch actively writes `previous[index]` into connected nodes. That defeats the sequence guard: an older response can replace a newer completed hydration with old policy/totals, a loading state or even another account's previously rendered HTML. The existing test only starts with an empty hint and changes identity; it does not cover a newer hydration completing first.

**Executed focused reproduction:** start hydration A on a connected hint containing `old-A-private-total`; change identity to B and start hydration B on the same node; resolve B with current activity status, then resolve A. Final `innerHTML` was exactly `old-A-private-total`.

**Minimal fix:** a superseded hydration must perform no DOM writes. For an identity change without a successor, clear only a mount still owned by that request, or leave a neutral loading/error state; never restore captured private HTML. Node ownership/generation must guard any cleanup as well as success painting.

**Regression test:** two deferred promises, resolve newer then older, and assert the newer policy/totals survive. Repeat with distinct identities and nonempty prior private HTML; also retain detached-node/history rebind coverage. Files: ui/activity-points.js and activity-points-178-ui.test.js.

### 3. Selecting an excluded group notice continues to promise post rewards

**Locations:** `src/views/group-pages.js:33`; `src/ui/group-interactions.js:44`.

An ordinary member who manages a group receives a new-post form containing both the notice option and an activity reward hint. Changing `kind` to `notice` updates image/body requirements only; it never hides or replaces the hint. Thus a notice still says it earns the current post award, although group-service correctly excludes notice creation. This is a direct mismatch with the required pre-submit exclusion guidance and the frontend report's claim that notice forms do not promise rewards.

**Reproduction by production renderer/caller inspection:** render an approved group for a non-admin owner (`canWrite=true`, `canManage=true`); the form contains `<option value="notice">` and `[data-activity-hint="post"]`. Select notice: the actual delegated change handler has no reward-hint branch. The reward promise remains until submission returns `ineligible`.

**Minimal fix:** update the hint when kind changes, hiding the reward promise or displaying explicit notice exclusion; restore the current policy hint when returning to post/gallery. Keep request identity and backend authority intact. Files: group-interactions.js, and group-pages.js only if initial kind/exclusion metadata is needed.

**Regression test:** exercise the actual bound change handler on a manager's form: post → notice removes the reward promise, notice → gallery/post restores it. Verify edits/admin/example forms still have no reward promise.

### 4. Late ordinary deletion receipts are assigned to the newly active account

**Locations:** `src/app.js:384,399`; identity capture point can be the common submit setup near line 372.

Post/comment deletion awaits the content API, then calls `rememberActivityFeedback(result,{identity:activeSessionIdentity})`. This uses the identity at response time, not the deleting actor at submission time. If A starts a delete, logs out and B logs in before A's request returns, A's recovered/debt amounts are stored under B and displayed to B on the following render. The new creation paths already guard the submitting account, but deletion does not.

**Evidence:** inspected both actual asynchronous delete branches and the active-identity update at app.js:194. A focused call through the production feedback store/consumer confirms a receipt tagged with the current B identity passes the consumer's account check and displays A's 80P debt amount. This is a source-traced async integration defect, not a full-app/browser reproduction.

**Minimal fix:** capture the submitting identity before the await and only remember the receipt if that submitting identity still matches the active account (or store it under the original identity so the existing consumer discards it for B). Apply consistently to both ordinary post and comment deletion; do not relabel old responses. A small shared production boundary is preferable if needed to test this without brittle source-line extraction.

**Regression test:** deferred successful deletion, change active identity before resolution, assert B receives no feedback and no A totals/debt; same-identity completion must still display aggregate reversal amounts. Files: app.js plus a small helper in ui/activity-points.js if warranted, and focused behavioral tests.

## Minor

No separate optional/style expansion requested. The four findings above cover the confirmed requirement gaps in this pass.

## Recommendation

Fix the four items together, run focused activity/group/cage integration tests, and re-review only that fix diff. Then root can perform the required final release gates and archive parity work. The current full-suite pass remains useful baseline evidence but does not cover the demonstrated races and target collisions.
