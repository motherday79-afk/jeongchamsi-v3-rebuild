# Groups171 backend review

Reviewed the approved Groups171 contract against `src/core/group-model.js`, `lib/group-service.js`, `lib/group-http.js`, `api/gateway.js`, Groups routing and cache invalidation in `src/app.js`, fictional examples, and focused backend tests. Read-only source review; no deployment, browser, network, or production data access.

**Latest verdict (final follow-up review):** All three original findings and the subsequent withdrawal-authorization regression are verified closed. **No concrete critical or important findings remain in the reviewed scope.** The focused backend suite passes **34 tests, 0 failures**. Historical findings and line references below are retained for traceability and do not describe outstanding defects.

## Closed P2 — Withdrawal exception bypassed hidden-group authorization before version errors

**Location:** `lib/group-service.js:69-72`.

The new `operation === 'leave'` exception skips detail authorization for every signed-in caller before checking the supplied version. An outsider with no membership can therefore distinguish a hidden pending/invite group from a nonexistent group: GET for the hidden group returns 404, but POST `{id: hiddenId, version: 0, operation: 'leave', input: {}}` returns 409; the same POST for a nonexistent ID returns 404. Supplying the hidden group's exact version returns 403, providing a version oracle as well. The model correctly prevents mutation, but this bypass regresses the service's explicit pre-version privacy protection.

**Reproduction verified through `groupRequest` and the real service/model:** For a newly created invite-only pending group and an unrelated signed-in user: `GET hidden -> 404 GROUP_NOT_FOUND`; `leave hidden version 0 -> 409 GROUP_CONFLICT`; `leave hidden version 1 -> 403 GROUP_FORBIDDEN`; `leave nonexistent version 0 -> 404 GROUP_NOT_FOUND`.

**Expected:** Only a caller with their own pending/active membership may bypass the pending/rejected detail projection to withdraw. Authorize that membership before checking version; all other callers should receive the existing detail-projection gate. This preserves cancellation while preventing unrelated users from discovering hidden groups.

**Verified resolution:** `lib/group-service.js:70` now bypasses detail projection only for `leave` when `groupViewer(...).canLeave` is true. All other callers pass normal projection before any version error. The new service regression passes for hidden pending and approved invite-only groups. Additional direct HTTP probes verified 404 `GROUP_NOT_FOUND` for an unrelated caller in pending, rejected, and approved invite-only states with both stale and exact versions. The existing authorized-withdrawal regression remains passing.

## Verified closure of the original findings

- **Gallery lifecycle ACL:** Post save marks assets as attached. The media ACL checks live references first; hidden references permit managers only, and previously attached media without a live reference is denied, including to its uploader and managers. Unattached previews remain available. New model regressions cover hidden uploader denial, manager hidden access, and deleted media denial.
- **Reapproval detail:** Pending/rejected detail now requires the actual owner or site admin. Existing membership alone no longer passes this gate. My Groups exposes the caller's membership withdrawal capability and version; the service regression demonstrates withdrawal while ordinary detail access is denied. The withdrawal exception is now authorized before version comparison, as verified above.
- **Closed unread news:** Both `groupSummary.unread` and My Groups notifications now require approved status. Closed groups therefore produce neither an unread badge nor an undismissable news item. The service regression verifies notification presence before close, absence after close, and retained withdrawal capability.

Re-ran `node --test tests/group-model.test.js tests/group-service.test.js tests/group-http.test.js` after the final fix: **34 passed, 0 failed**. No application source or tests were edited during this follow-up review.

## 1. P2 — Deleted gallery media remains addressable through the private image endpoint

**Locations:** `src/core/group-model.js:107-108,130-138`; `lib/group-service.js:102-107`.

`post-delete` clears the post's images but leaves the corresponding assets. `canReadGroupImage` grants any manager, or an active uploader, access before checking whether an undeleted, visible post references the asset. Consequently the authenticated image endpoint still retrieves bytes for a deleted gallery image. An ordinary gallery author also retains direct access while a moderator-hidden post has disappeared from their detail response.

**Reproduction:** Create/approve a members-only group; approve an ordinary member; upload a gallery asset as that member; publish a gallery using it; delete the post as the owner with a reason; request the previously returned image URL as the uploader. `service.image(...)` still returns a stream and calls private Blob storage, although `groupDetail(...).posts` omits the deleted post. A direct model probe also returned `{authorVisiblePosts: 0, authorCanReadImage: true}` after hiding the post.

**Expected:** Deleted content has no read exposure. Hidden gallery media follows the same manager-only visibility as its post. Unattached upload previews need to remain possible, but should be distinguishable from assets previously attached to deleted/hidden content.

**Fix direction communicated:** Track attachment/lifecycle state; authorize references before any uploader preview exception. Preserve manager access to hidden references and deny deleted references unless a separate, live authorized post also references the image.

## 2. P2 — Reapproval states are visible to existing group members despite owner/admin-only contract

**Location:** `src/core/group-model.js:33-37`; related My Groups projection at `lib/group-service.js:49-50`.

`groupDetail` uses a single `related` flag containing pending and active memberships for both invite access and pending/rejected group access. Renaming an approved group sets it back to pending while preserving its membership records, so existing ordinary members pass the pending/rejected gate. They receive the new name, description, rules, version, and counts, even though the contract reserves those states for the owner/site admin. Posts and events are correctly omitted because `viewer.canRead` is false; the gap concerns the restricted group's introduction and metadata.

**Reproduction:** Approve a group; approve an ordinary member; change its name as the owner; call `groupDetail(group, member)` or service GET as that member. It succeeds with `status: 'pending'` and the changed name instead of `GROUP_NOT_FOUND`. Rejecting that reapproval produces the same access gap.

**Expected:** Non-owner/non-admin requests for pending or rejected details return `GROUP_NOT_FOUND`, even with an existing membership or invite token. Keep membership withdrawal possible with a separate privacy-safe authorization path rather than relying on successful detail projection.

## 3. P2 — Closed groups can leave permanent unread in-app news

**Locations:** `src/core/group-model.js:55,121-122`; `lib/group-service.js:51`; related routing condition in `src/core/group-routing.js:10`.

My Groups notifications include readable closed groups with unread activity. Both `read` and `notify` call `requireActive`, which requires the group itself to be approved, so an active member cannot clear that notification or turn the preference off once the owner closes the group. Routing also records reads only for approved groups with `canWrite`, reinforcing the mismatch.

**Reproduction:** Approve a group and member; publish a post as the owner while the member is away; close the group; list My Groups as the member. The closed group remains in `notifications`. Calls to `read {}` and `notify {enabled:false}` both return `GROUP_REVIEW_REQUIRED`. This was reproduced through the service, not just by inspecting conditions.

**Expected:** A member can finish reading/dismiss or disable in-app news for an otherwise readable closed group. Either allow active members' read/preference updates in approved and closed groups while retaining content read-only behavior, or consistently remove closed groups from unread notifications. Coordinate the frontend read trigger with the chosen backend behavior.

## Verification and coverage

Ran:

```sh
node --test tests/group-model.test.js tests/group-service.test.js tests/group-http.test.js
```

Result on the reviewed state: **28 tests passed, 0 failed**. Additional inline Node probes reproduced all three findings; the media probe verified that the private storage getter was invoked after post deletion. No source or test files were edited by this reviewer.

The reviewed implementation otherwise enforces site-admin creation review, scoped owner/moderator/member permissions, peer/owner moderation restrictions, original-author opinion editing, private membership projections, membership-removal media revocation, and a compare-and-swap commit across group/index/user references. The three fictional samples are isolated from real totals and Redis writes and remain read-only for admins. Gateway identity comes from the existing validated session; JSON uses no-store, media uses private/no-store plus nosniff; Groups page snapshots are excluded from navigation caching and successful mutations clear navigation caches.

No browser/device QA or live Redis/Blob deployment was performed. Focused service tests use an in-memory command implementation; the Redis Lua key/argument mapping and actual gateway integration were reviewed statically. Existing unrelated source/assets were outside this review's mutation scope.
