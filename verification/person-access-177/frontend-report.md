# Release 177 frontend report

## Files

- `src/views/person-refresh.js`: top and bottom refresh mounts, 24-hour benefit and billing copy, active-access end/remaining banner, updated administrator policy copy.
- `src/ui/person-refresh.js`: shared top/bottom charging flow, pending recovery, immediate redraw after publication, server-clock countdown, exact expiry timer, visibility/BFCache revalidation, and pre-fetch paid-markup masking.
- `src/views/politicians.js`: paid full-report rendering without administrator controls, top refresh action/panel, active-access display, and stale/expired projection suppression.
- `src/views/politician-compare.js`: authoritative per-person access checks, paid 2–4-person comparison, complete-set gating, mixed/expired unlock guidance, and transport-time expiry handling. This file was integrated and reviewed by the parent implementer after handoff.
- `src/app.js`: conservative detail-response transport aging, automatic redraw, protected-route lifecycle setup, and exclusion of person/compare pages from navigation HTML snapshots.
- `src/core/navigation.js`: protected person/compare route classification.
- `src/core/auth.js`: optional fresh session read for cross-tab/BFCache authorization revalidation.
- `css/person-refresh-175.css`: top confirmation panel, active-access banner, expired/access-gate states, responsive layout, and explicit light-card text colors.
- `tests/person-access-177-ui.test.js`: detail authorization, top/bottom flow, automatic redraw, expiry, visibility/pageshow, fresh-session, and history behavior.
- `tests/person-access-177-compare.test.js`: comparison search, expiry, identity, completeness, and response-transport regressions.

## Behavior

- An authenticated non-admin sees a `갱신하기` action alongside the existing top actions. It opens an accessible in-place fee panel without scrolling. The lower panel remains and both use the same request/pending handler.
- Confirmation states the fee, success-only charge, and 24-hour full-analysis benefit. A successful publication immediately reloads the detail page. Unknown network outcomes retain the request ID and status-recovery path.
- Paid members receive the existing full diagnosis 01–10 and prescription renderers while photo editing and other administrator operations remain account-role gated.
- Active paid views show the end time and server-offset remaining time. Detail responses include request transit time when deciding whether an entitlement is still renderable.
- Paid members can compare two to four people only when every requested response loads, matches the requested person, and remains eligible at the latest authoritative server time. Mixed, expired, failed, and over-capacity sets show guidance instead of rendering a successful subset. Ordinary two-person member comparison remains available when neither person is unlocked.
- Paid markup is masked synchronously at expiry and before visibility/BFCache revalidation. Person and compare HTML is not restored from navigation snapshots. Revalidation bypasses the five-second session cache and reloads the server-authorized projection.

## Tests

- Final focused command: 41 tests passed, 0 failed across release-177 UI/compare tests, existing 175 refresh/API handler tests, detail loading tests, and navigation snapshot/rebind tests.
- `node --check` passed for all modified JavaScript modules.
- Existing 175 pending-request recovery and handler behavior remain green.

## Concerns

- Live browser HTTP access was unavailable under the approved task constraints, so no live visual or assistive-technology QA was performed. Source-level responsive/color checks and behavioral DOM tests cover the new states.
- Browser cache query versions are intentionally left for parent integration, per the brief.
