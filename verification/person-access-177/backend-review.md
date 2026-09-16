# Release 177 backend review

## Verdicts

- **Spec compliance: PASS** for Task 1 and the backend responsibilities in the approved person-access specification.
- **Code quality: PASS**. No concrete critical or important defects found in the reviewed changes.
- **Recommendation:** Approve the backend changes. Frontend behavior and release packaging remain separate review scopes.

## Scope

Reviewed the supplied `backend.diff` against the 176 baseline, the approved specification at `docs/superpowers/specs/2026-09-16-person-access.md`, Task 1 of `docs/superpowers/plans/2026-09-16-person-access.md`, and the current implementation:

- `lib/person-analysis-access.js`
- `lib/person-publication.js`
- `lib/refresh-billing.js`
- `api/gateway.js`
- `tests/person-access-177.test.js`
- `tests/person-access-api-177.test.js`

Inspected supporting publication, wallet mutation, session authentication, read scoping, and intelligence projection code to verify the integration. No Git operations, production access, live collection, or source modifications were performed. Actively edited frontend files were excluded.

## Findings

No actionable critical or important findings.

## Compliance evidence

| Requirement | Evidence |
| --- | --- |
| Atomic charge, publication, and grant | `lib/person-publication.js` includes the wallet in the same compare-and-swap key set as the published draft, rankings, refresh state, and media revision. Grant creation and debit occur on the in-memory wallet before the single transaction commits. |
| Exactly 24 hours, scoped to member and person | `lib/person-analysis-access.js` stores grants in the authenticated member's wallet under the person ID, verifies the stored person ID and duration, and requires `grantedAt <= now < expiresAt`. |
| Idempotency | Billing begin/status/failure recovery and publication replay resolve an existing paid ledger entry and recompute its access metadata from the current wallet. Replaying a completed request does not call the grant-writing helper or debit again. |
| Failed purchases preserve rights and balance | Grants are only written as part of publication settlement. Failed collection and failed publication tests verify no new debit/grant; failed repeat collection preserves the previous grant. |
| Current server-side detail/compare authorization | `api/gateway.js` reads entitlement after asynchronous report/enrichment reads, immediately before projection, and uses server time. Both detail and compare share this path. Client query role/tier/expiry values are ignored. |
| Suspended authentication | Suspended users receive public report projection and cannot use the paid-refresh endpoint. |
| No administrator mutation rights | The purchased tier is local to report projection. The member's stored account role is unchanged, and tested administrator endpoints still return 403. |
| Latest administrator republication without extending expiry | Grants live separately from public snapshots. Individual/full publication and purchase-policy disabling do not rewrite them. Subsequent detail reads use the current public intelligence path. |
| No retroactive grant or charge for viewing | A wallet with no grant projects inactive access, regardless of old ledger entries. Detail/compare access reads issue no wallet mutation; quote and status recompute metadata without charging. |
| Response metadata and caching | Member responses carry matching top-level and intelligence `analysisAccess`; quotes and successful paid results carry metadata. Existing `Cache-Control: no-store` remains. |

## Validation

Executed against the reviewed workspace:

```text
node --test tests/person-access-177.test.js tests/person-access-api-177.test.js
10 tests passed, 0 failed

node --test tests/refresh-points-175.test.js tests/person-publication-175.test.js
18 tests passed, 0 failed
```

The 28 passing tests cover entitlement success, exact expiry, replay, member/person isolation, disabled purchases, administrator republication, failures, delayed HTTP projection, query spoofing, account-role separation, concurrent identical requests, balance changes during collection, and publication consistency. Storage tests use the repository's in-memory compare-and-swap fixture; the actual Lua transaction was also inspected. Full-suite regression, browser lifecycle behavior, deployment tracing, and artifact parity are outside this bounded backend review.
