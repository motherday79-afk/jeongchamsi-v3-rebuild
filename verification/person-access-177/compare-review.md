# Release 177 scoped comparison review

## Verdicts

- **Spec compliance: PASS** after the scoped timing correction described below.
- **Code quality: PASS** after the scoped timing correction. No unresolved critical or important findings.
- The original important finding below is retained as review history and is now **RESOLVED**.

## Follow-up verification

Re-reviewed only the timing correction in current `src/views/politician-compare.js` and its new regression. Each GET now captures `requestedAt` before invoking the service, and normalization adds `renderedAt - requestedAt` to the server timestamp. This conservatively includes response transit and slower-peer waiting time; the normalized value flows through both paid eligibility and shared expiry metadata. It closes the demonstrated expired-on-arrival path.

Ran `node --test tests/person-access-177-compare.test.js tests/person-access-api-177.test.js`: **10 passed, 0 failed**, including `response transport time is included when judging near-expiry comparison access`. The regression exercises the original 500 ms remaining / 600 ms delivery-delay scenario and now requires the access gate with no deep topic rendering. No new actionable defects identified in this scoped correction. Other UI lifecycle work remains outside this review.

## Resolved important finding: include elapsed time before response receipt

**File:** `src/views/politician-compare.js`, lines 203–212 (especially 207).

The new normalization adds only `renderedAt - receivedAt` to each response's `serverNow`. The server timestamp was sampled before sending the response, so this omits time spent delivering and parsing that response. If both full reports are generated shortly before their grants expire and delivered after expiry, both `receivedAt` values are close to render time. Their normalized clocks remain before expiry, so `hasActivePaidAccess` permits the expired reports and the aggregate countdown starts with the original remaining duration.

**Reproduction:** Start both comparison requests with the local clock at 10000. Both server reports carry `serverNow: 1000`, `expiresAt: 1500`, `active: true`, and full administrator report tiers. Advance the local clock to 10600 before resolving both service promises. Actual elapsed time since server projection is 600 ms, exceeding the 500 ms remaining grant. The current renderer returns:

```json
{"elapsedAfterServerProjection":600,"grantRemainingAtProjection":500,"paidMarkup":true,"gated":false}
```

This violates the approved requirement that a response near expiry must not extend access through an old screen. The existing slower-peer regression only covers delay after at least one response has arrived, so it does not catch both responses spending time in transit.

**Requested correction:** Record request start time and conservatively account for the complete request elapsed time when deriving the server time used for entitlement checks, or carry trustworthy response-age information from the service layer and subtract it. Include a regression in which every paid response is already expired when delivered. Use the resulting normalized clock for the shared expiry metadata as well as eligibility.

## Scope and successful checks

Reviewed supplied `qa177/compare.diff`, current `src/views/politician-compare.js`, the comparison tests, and the real API-to-comparison integration case against the approved person-access specification. Other UI lifecycle work and release versioning were excluded. No source edits or subagents.

- Ordinary members retain the initial and second-person search forms and ordinary two-person report path.
- Paid two-, three-, and four-person comparisons use the full topic/prescription renderers and carry both paid semantic markers and the existing administrator CSS class alias.
- Deep reports require all requested records to load. Identity mismatches, failed records, mixed grants, and already-expired full-tier responses gate the report rather than render a successful subset.
- Shared metadata uses the earliest expiry across selected grants.
- The API integration confirms three separately purchased people can be compared without another wallet charge and an expired selected grant gates the report.

## Validation

```text
node --test tests/person-access-177-compare.test.js tests/person-access-api-177.test.js
9 passed, 0 failed

node --test --test-name-pattern='paid members can compare|mixed unlocked|ordinary two-person|comparison never' tests/person-access-177-ui.test.js
4 passed, 0 failed
```

The separate clock-controlled reproduction above demonstrates the important uncovered defect despite the passing regression tests. Browser lifecycle integration remains outside this review.
