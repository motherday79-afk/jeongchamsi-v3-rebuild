# Release 177 final Task 2 and integration review

## Verdicts

- **Spec compliance: PASS.** Task 2 implements the approved person-scoped paid detail and comparison flow. Backend responsibilities have a separate PASS review.
- **Code quality: PASS after correction.** No unresolved critical or important findings. The concrete retry defect identified in this review is resolved below.

## Scope

Reviewed the approved specification, implementation plan, supplied 176-to-177 diff, frontend report, backend and comparison review reports, and current source. Current source takes precedence over the supplied diff for the final mask-copy, timer-cleanup regression, and navigation retry corrections.

Inspected top and bottom refresh mounts and their shared billing/pending handler, automatic successful-publication redraw, account role versus purchased report tier, detail and 2–4-person comparison gating, server-time aging, expiry timers, visibility/BFCache revalidation, session-cache bypass, navigation snapshots, API metadata integration, changed browser import versions, and relevant CSS selectors.

No Git operations, source modifications, full-suite duplication, live collection, charging, or deployment were performed. The parent is running the full suite and packaging checks separately. Browser visual and assistive-technology QA was unavailable; this review does not claim to replace it.

## Resolved important finding: comparison retry did not request new data

The new access-gate button (`모두 다시 확인`) generated the already-current comparison route. `src/app.js` forwarded its layout-route event to `createNavigation.navigate()`, which previously returned immediately for every same-route request. Consequently, a temporary failed selected-person response left the user with a retry button that did nothing.

A renderer/navigation reproduction on the normally generated encoded route returned:

```json
{"currentRoute":"/compare?ids=a%2Cb&run=1","retryTarget":"/compare?ids=a%2Cb&run=1","requestsTriggered":0}
```

The parent corrected `src/core/navigation.js`: same-route person/compare navigation now invokes `onRoute` with `preserveScroll:true` and `freshSession:true`, without adding a history entry. Other same-route navigation remains unchanged. This also restores the existing comparison rerun control. The new regression exercises the encoded comparison route, detail route, and ordinary `/now` route. I reviewed the correction and executed the focused regression successfully.

## Compliance and quality evidence

- The upper refresh action opens its own focusable fee region next to the existing detail actions. The lower mount remains. Both controls read the same member/person pending key and invoke the same confirmation, request, and status-recovery logic.
- Successful publication clears the pending request and immediately redraws the detail using a new authorized API response. Repeat collection still requires explicit fee confirmation; view and comparison paths perform no purchase request.
- Paid reports reuse the existing full diagnosis and prescription renderers. Photo editing and administrator operations depend on the account role, not the projected report tier.
- Detail transport aging rejects an expired full projection. Comparisons age requests through transit and slower peers, require the entire requested set and matching person identities, and gate mixed, expired, failed, and over-capacity deep comparisons.
- The access banner carries the server clock, render time, and deadline. Expiry removes paid markup before requesting new data. Visibility/BFCache restoration masks it before a fresh-session revalidation. Person/compare HTML is excluded from navigation snapshots. Watch setup clears prior timers, including restoration of the cached homepage.
- Current server responses supply matching top-level and intelligence access metadata. The browser imports for changed modules and stylesheet use release 177; backend imports include the entitlement helper directly.
- Source-level CSS inspection found no concrete important legibility defect: top fee panels and access banners have explicit text colors; the comparison access banner is outside the dark report heading; responsive stacking is provided. Actual browser layout remains unverified.

## Validation performed in this review

```text
node --test --test-name-pattern='retrying the current|expiry hides|access guard schedules|visibility and pageshow' tests/person-access-177-ui.test.js
4 passed, 0 failed
```

The parent separately reported 21 passing focused UI/navigation tests after the retry correction. Backend and comparison reviews document their own passing focused suites, including the resolved response-transport expiry regression. Final full-suite and release-artifact parity results belong to the parent release verification record.
