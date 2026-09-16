# Activity points 178 — Task 1 independent backend review

**Current scoped verdict after fix round 1: both findings ADDRESSED; no remaining blocker from this Task 1 review.** Spec and quality are approved for the reviewed backend scope. The original findings below are retained as review history. Task 2 frontend and Task 3 release validation remain outside this verdict.

Reviewed the supplied full 177→178 backend diff, approved spec, Task 1 plan and backend report. Inspected unchanged code only for named risks: shared CAS behavior, cascade deletion, group operation shapes and API identity projection. No source edits, Git, real Redis, network, live data, or repeated covering suite. The implementer's 79/79 result is reported evidence, not a suite independently rerun here. Two small in-memory service reproductions below were run successfully.

## Important 1 — Entity decoding occurs after NFKC, allowing normalized duplicates to earn again

**Location:** `lib/activity-points.js:22–23`, function `normalized`.

NFKC is applied to the input before numeric HTML entities are decoded. A numeric entity representing a fullwidth Latin letter becomes a fullwidth letter only after normalization has finished. It therefore contributes to meaningful length and a different hash than its ordinary ASCII equivalent. The duplicate check incorrectly awards an explicitly equivalent normalized body a second time. This violates the specified NFKC normalization and cross-content duplicate rules.

**Focused reproduction:** create a community post with `Citizens should examine transport policies carefully and discuss practical improvements with their neighbors.`; advance the clock 30 seconds; create an itsme post with each ASCII letter replaced by the numeric entity for that letter's fullwidth form (code point + `0xfee0`). Both receipts returned `reason: "awarded", earned: 100`; `earnedToday` increased from 100 to 200. Real community/point services ran against `activityStorage`; no Redis/network used.

**Minimal fix:** normalize the decoded text with NFKC before tag/address/jamo removal, meaningful-character counting, repetition checking and hashing. Keep all callers on this same canonical representation.

**Regression test:** ordinary/fullwidth/entity-encoded fullwidth variants of the same body across community/itsme and post/comment must yield one award and then `duplicate`. Include entity-encoded decomposed Unicode to ensure combining sequences reach the same canonical form. A focused service test is sufficient; retain the existing plain-entity duplicate test.

## Important 2 — Parent deletion retains awards for the deleting member's own removed descendants

**Locations:** `lib/community-service.js:67` (`deletePost`); `lib/group-service.js:98` (parent deletion reversal). Group deletion actually clears all comments at `src/core/group-model.js:109` (unchanged).

The transaction reverses only the explicitly selected parent event, then removes its comments and (for a community cage) child participation posts and their comments. This correctly preserves other members' awards, but also preserves the deleting member's own removed comments/child posts. Those awards can no longer be recovered through explicit own-content deletion because their content is gone. A member can retain activity points while removing the very activity that earned them. Root confirmed that the approved own-deletion requirement includes the member's own cascade-removed content, while other authors must retain their rewards.

**Focused reproduction:** the same member earned 100P for a parent, another independent 100P post, and 50P for a comment on the parent; a different member earned 50P for another comment on that parent. Deleting the first member's parent reduced their balance from 250P to 150P. The correct remaining balance is 100P for the independent post: the removed own comment's 50P remained. The unrelated author's balance correctly remained 50P. The affected group/cage paths have the same parent-only reversal logic by inspection.

**Minimal fix:** before deleting, enumerate the removed subtree. Within the existing single CAS, reverse every unrevoked reward event whose removed content belongs to the deleting member. For community cages include removed child participation posts and comments under every removed post; for groups include the deleting author's comments under the removed post. Continue preserving other authors' awards and the stored hash/event history. Sum reversal receipt amounts if more than one event is reversed. Do not treat a moderator removing another author's content as fraud or reverse that author's points.

**Regression tests:** community parent with own and other-author comments; community cage with own rewarded child post and comments plus other-author descendants; group parent with own and other-author comments. Check only the actor's removed awards reverse, hashes/daily earned totals remain, spent awards become debt without taking recharge funds, and already-revoked descendants are not reversed again.

## Positive review results and limits

- Shared community CAS compares all content/policy/record/wallet/audit inputs and writes through one MSET. Current wallet fields are reread on conflicts, preserving recharge, refresh requests and 177 analysis entitlements.
- Group activity Lua key/argument offsets are internally consistent: user flags, expected reward documents and next documents align with the JS caller. All string comparisons and index/member Redis type checks precede writes; group document, reward documents and indices participate in the same script. No malformed Lua argument/type blocker found by inspection. The controlled test double does not execute Lua or validate actual Redis types, so this is code review evidence only.
- Cap, KST day, shared cooldown, partial awards, gross allowance consumption during debt offset, replay-before-rate, retained hashes, and idempotent reversal are coherently implemented.
- Spending hooks consume activity credit in both cage billing and actual person-publication billing. Reversal draws only from activity credit and records debt for the rest; recharge/bonus fields remain separate.
- Gateway identity comes from signed session plus current stored user; status is preserved by `publicUser`. Administrator operations enforce role and suspension. Public content receives no stored reward receipts, and member/admin views are gated.
- No unrelated pre-existing defect or stylistic change is requested.

## Minor

No separate minor finding requiring action. Persistent record/audit growth and lack of live Redis/browser execution are already accurately disclosed by the implementer.


## Scoped re-review — fix round 1

Reviewed only `qa178/backend-fix1.diff`, the appended implementation report and the final `backend-fix1.log` result. No source modifications, repository expansion, subagents, suite reruns, Redis or network execution.

- **Important 1: ADDRESSED.** `normalized` now runs NFKC after entity decoding and before all filtering/counting/hashing. The added service tests cover direct fullwidth, entity-fullwidth and entity-decomposed accents, with isolated jamo still excluded.
- **Important 2: ADDRESSED.** Community deletion enumerates precisely the posts in its existing removal set and comments under those posts, selecting only the deleting member's ownership. Group deletion selects the actor's removed parent/comment records from the previous document, including the moderator's own collateral comments without reversing the other author's post. `revokeOwnActivities` delegates each target to the existing idempotent financial reversal and aggregates only newly reversed events. All mutations remain within their original shared CAS.
- **New breakage in the fix diff: none found.** The new aggregate reversal receipt uses `events[]` plus summed `recovered`/`debtAdded`, accurately documented for pending Task 2 consumers. Direct community comment deletion retains its single-event receipt. Missing legacy reward events and already-revoked events safely contribute zero. Hashes, gross daily totals, recharge protection and other-author awards remain preserved.

Verification evidence inspected: implementer focused run **26/26 passed**, zero failures/skips; six new regression cases cover both normalization variants and community/cage/group/moderator cascades, prior revocation, failed CAS and spent-credit debt. This re-review did not independently rerun those tests.

**Decision:** both original Important findings are resolved. No Critical, Important or Minor finding remains within the scoped backend review. Proceed to frontend integration and the planned release gates; this is not a claim of full release validation.
