# Activity points 178 — backend Task 1 report

Implemented Task 1 only. No Git operations, live data, network collection, deployment, dependency/package changes or frontend changes. Backend source mutations stopped after the successful covering suite for root review.

## Result and storage boundaries

- New `lib/activity-points.js` is dependency-independent of community/participation services, avoiding an import cycle. It supplies the shared policy, KST day accounting, meaningful-content normalization, duplicate/repetition checks, shared cooldown, request identity, awards, debt offset, spending and reversals.
- Community content, shared policy, member reward record, wallet and operational audit/suspect document participate in one existing multi-key CAS. Conflict retries re-read wallet, entitlement, pending refresh and charge fields.
- Group creation/comment/deletion uses a new `GROUP_ACTIVITY_COMMIT_LUA` alongside the original non-activity commit. It compares group and all reward documents before writing. Group document, public index, membership indices, policy/record/wallet/audit all commit together. Redis index/set types are checked before writes. Group reward-record conflicts retry; request replay is recognized before rejecting a stale group version, after current group authorization.
- Reward metadata is response-only; no activity receipt, daily earnings, debt or restriction state is saved into public community/group content. Private member records contain hashes, request mappings and reward events. Deleted hashes remain.
- Own explicit deletion reverses that item's award. Parent deletion does not reverse collateral comments. Group moderator hide/delete does not automatically revoke another author's reward. Site admin explicit revoke is separately authenticated and audited.
- Spending activity credit first is integrated into paid cage opening and actual person publication billing; recharge points/bonuses never settle activity debt. Existing analysis access and pending refresh fields survive.

## API contract

`GET /api/v3/points`, `?wallet=1`, and admin-only `?member=<id>` add:

```js
activityRewards: {
  policy: {enabled, postPoints, commentPoints, dailyLimit,
           postMinLength, commentMinLength, cooldownSeconds},
  day, earnedToday, remainingToday, debt, credit,
  restrictedUntil, restrictionReason
}
```

Defaults are enabled, 100/50 award, 2000 combined daily maximum, meaningful length 50/15 and shared 30-second cooldown. Day is KST YYYY-MM-DD. Restrictions use epoch milliseconds, with `0` for unrestricted. Anonymous ordinary status exposes policy and zero member values; wallet requires login. Existing `?clock=1` stays a clock-only response.

Admin ordinary status additionally returns:

```js
activityAdmin: {policy, suspects, audit}
```

A suspect carries `userId,nickname,eventId,contentId,kind,scope,domain OR groupId,reason,at,earned`. It contains no submitted body. Suspect list is most recent first, capped at 200.

Admin member response adds **top-level `activityEvents`**, newest first, independently of `activityRewards`. Events include `eventId,contentId,scope,domain OR groupId,kind,at,day,earned,credited,offset,reason,revoked,receipt`; reversed events also contain `revokedAt,revokeReason,revokedBy`. Successful events are available here for deliberate selection and revocation.

New POST operations (camel-case service method in parentheses):

- `activity-policy` (`activityPolicy`): `{policy:{...partial policy fields},reason}`. Strict booleans and finite safe integer numeric values. Points and daily cap: 0..1,000,000; minima: 1..10,000; cooldown: 0..3,600 seconds. Zero point award returns exclusion reason `disabled`. Reason required.
- `activity-revoke` (`activityRevoke`): `{userId,eventId,reason,requestId}`. Returns `{ok,revoked,recovered,debtAdded,event}`. No second financial reversal for an already reversed event; request replay returns the prior result. Unknown event rejected.
- `activity-restrict` (`activityRestrict`): `{userId,hours,reason,requestId}`, 0..720 hours, 0 clears. Returns `{ok,userId,restrictedUntil,restrictionReason}`. Request replay supported.

The gateway obtains identity/role/status from the signed session and current stored account, never submitted `userId` or `role`. All three operations require non-suspended admin identity. Non-admins cannot retrieve member detail or operational logs.

Creation receipts:

```js
activityReward: {
  status: 'credited' | 'excluded',
  reason: 'awarded' | 'minimum-length' | 'repetitive' | 'duplicate' |
          'daily-limit' | 'restricted' | 'disabled' | 'ineligible',
  earned, credited, offset, earnedToday, dailyLimit, remainingToday
}
```

Community post receipt is `item.activityReward`; comment receipt is `comment.activityReward`; group receipt is top-level `activityReward`. Send `input.requestId` for ordinary/group posts and group comments; regular comments use comment payload `requestId`. Accepted create tokens are 12..100 ASCII letters/digits/hyphens/underscores. Admin operation tokens retain existing point-service 12..80 letters/digits/hyphens rule. Raw submitted body is retained only as a hash for replay identity, so storage whitespace trimming does not break retries.

Shared rate rejection: HTTP 429, `{ok:false,error:'ACTIVITY_RATE_LIMIT',retryAfterSeconds}`. It prevents both content and award persistence. Replay is checked first. Own deletion responses add `activityReversal:{revoked,recovered,debtAdded,event?}`. Already missing content can still return existing not-found response, but cannot reverse twice.

Wallet ledger additions:

- `type:'activity'`, `points:credited`, `earned,credited,offset,eventId,kind,scope,contentId,at`.
- `type:'activity-revoke'`, `points:-recovered`, `recovered,debtAdded,earned,eventId,reason,by,requestId,at`.

No zero-point exclusion is added to the spendable wallet ledger; it remains available in administrator member events. Offset awards still consume gross earned daily allowance. Reversal never restores today's allowance.

## Failing-first evidence

1. `node --test tests/activity-points-178.test.js`: initial 7/7 failures; saved `backend-red.log`. Missing receipt and wallet activity status, duplicate create on replay, missing admin operations, and two concurrent rewards were demonstrated before implementation.
2. `node --test tests/activity-points-178-groups.test.js`: 3 intended missing-feature failures and 1 pre-existing invariant pass; `backend-groups-red.log`. Missing group receipt, HTTP 201 instead of 429, missing commenter reward. Existing failed-write no-op invariant already passed and was not claimed as a new red.
3. Dedicated spending/metadata/reversal cycle: 4 failures in `backend-extra-red.log`: activity credit remained 100 after real refresh/cage spending, missing reversal receipt, missing admin history domain. Implemented the matching behavior and passed.
4. Edge regression cycle: 2 failures in `backend-edge-red.log`: identical request with surrounding body whitespace was rejected after storage trimming; stored example parent comment was incorrectly rewarded. Fixed original-body request signature and parent example/demo exclusion.
5. The debt fixture originally crossed KST midnight unintentionally. Moved ordinary fixture time to 14:50Z and advanced the dedicated boundary test explicitly to 15:00Z. This corrected a test expectation without changing day accounting.

## Verification

Final command:

```sh
node --test tests/activity-points-178*.test.js tests/group-service.test.js tests/group-http.test.js tests/group-model.test.js tests/cage-title-storage.test.js tests/refresh-points-175.test.js tests/person-access-177.test.js tests/person-access-api-177.test.js
```

`backend-covering.log`: **79 tests, 79 pass, 0 fail, 0 skipped**, exit 0. Includes real service/model integrations behind controlled Redis boundaries, actual gateway signed-session authorization, normalization/entity/punctuation duplicates, rate and request replay, cap and KST reset, CAS refusal/concurrency, group indices/privacy/moderation, restriction/revoke, real paid refresh and cage activity spending, recharge bonus protection and 177 paid entitlement preservation.

Existing group-service storage double originally silently interpreted the expanded Lua arguments with its old layout. Replaced only that double with the shared exact-layout boundary; all ten existing group-service tests still pass without disabling rewards or rate controls.

## Modified files

Production:

- lib/activity-points.js (new)
- lib/community-service.js
- lib/group-service.js
- lib/group-http.js
- lib/participation-admin.js
- lib/person-publication.js
- api/gateway.js

Tests:

- tests/activity-points-178.test.js (new)
- tests/activity-points-178-groups.test.js (new)
- tests/activity-points-178-spending.test.js (new)
- tests/activity-points-178-api.test.js (new)
- tests/helpers/activity-storage.js (new)
- tests/group-service.test.js (narrow storage-double replacement)

## Limits and review notes

- No Redis server is installed locally. Redis Lua argument and atomic boundary behavior is checked using a controlled command-level model and code review, not execution in a live Redis interpreter. No claim of live Redis verification.
- No browser verification, deployment, live award, real payment or collector request performed.
- Full repository suite, deployment tracing, frontend integration and archive parity belong to root Task 3; this report claims only the covering suite above.
- Per-member hashes/events/request identities and audit records are intentionally preserved without expiry to prevent deletion/replay farming and preserve audit. They grow over time, as does the existing wallet ledger; operational archival is outside this patch. Suspect display queue alone is bounded.
- No material unresolved implementation flaw found during final local review. Root independent review remains pending.

## Review fix round 1

Addressed both Important findings in `backend-review.md`; no unrelated production changes.

1. Canonicalization now applies NFKC to decoded text before markup/address/jamo filtering. Existing initial normalization remains useful for fullwidth entity syntax. Ordinary text, direct fullwidth letters, numeric-entity fullwidth letters, and entity-encoded decomposed accents now share the same canonical hash. Isolated entity-encoded jamo still contribute no meaningful length.
2. Parent deletion now enumerates actor-owned content in the exact removed subtree before modifying content. Community parent removal reverses the actor's parent/child participation posts and comments under every removed post; group parent removal reverses the actor's post and comments, including the actor's own comments when moderating somebody else's post. Other authors' awards remain untouched. The same existing CAS persists the content, all actor reversals, wallet, records and indices. Already-revoked events contribute zero and cannot reverse twice. Hashes and gross daily earnings remain intact.

The earlier report's collateral-comment wording is superseded: **actor-owned cascade-removed activity is reversed; only other authors' collateral activity is preserved.**

Aggregate parent/group `activityReversal` now has `{revoked,recovered,debtAdded,events}`. `recovered` and `debtAdded` are totals over newly reversed actor-owned items; `events` lists those newly reversed events. The frontend should rely on the aggregate monetary fields. Direct ordinary comment deletion retains its existing single-event receipt.

Focused failing-first evidence:

- `backend-fix1-red-normalization.log`: 2/2 failed (`awarded` instead of `duplicate` for entity-fullwidth and entity-decomposed input). Both passed after the normalization fix.
- `backend-fix1-red-cascade.log`: 4/4 failed. Community/group own parent+comment returned 100 recovery instead of 150; moderator own-comment reversal was missing; spent cage subtree returned 0 added debt instead of 200.

Final command (only the requested focused suites):

```sh
node --test tests/activity-points-178.test.js tests/activity-points-178-groups.test.js tests/activity-points-178-spending.test.js
```

`backend-fix1.log`: **26 tests, 26 pass, 0 fail, 0 skipped**, exit 0. Regressions cover ordinary/cage/group removed descendants, independent and other-author rewards, canonical hashes after deletion, unchanged daily gross earnings, prior admin reversals, failed community CAS, and actual cage spending before cascade recovery becoming debt without taking the remaining 200 recharge points. Existing real refresh/cage spending and entitlement tests also pass.

Round-1 changed files only: `lib/activity-points.js`, `lib/community-service.js`, `lib/group-service.js`, `tests/activity-points-178.test.js`, `tests/activity-points-178-groups.test.js`, plus this report and QA logs. No change to authorization, public projection, transaction Lua or unrelated features. No live Redis or network execution; prior verification limits still apply. Mutations stopped for root scope review.
