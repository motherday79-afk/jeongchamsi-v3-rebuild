# Groups 171 frontend final re-review

## Verdict

**Approved — no material frontend findings remain.** The current owned client, routing, views, interactions, CSS, and tests satisfy the approved Groups contract within the read-only review scope. The original C1/C2, I1-I7, and the three lifecycle findings from the first re-review are closed.

Backend/shared-entry packaging was reviewed separately. Physical browser QA was not performed, as required by the standing restriction.

## Closure evidence

- **Examples are read-only in actual seed use.** `renderGroupDetail` normalizes example viewer and item mutation capabilities off before rendering. Both readable and locked example regression cases reject all operation forms. The three real seed examples use `/assets/groups/examples-171.webp` with `politics|culture|social` `-a|-b` crop metadata; cover, post, and gallery render through `group-atlas` wrappers and the CSS performs true 2×3 tile clipping/scaling rather than applying object-position to the uncropped full atlas.
- **Upload/save sequencing is safe.** Every successful image immediately enters the hidden image-id field and advances only the initiating connected detail's version. The form is disabled and marked submitting/uploading during upload, blocking simultaneous saves and duplicate uploads. A later file failure preserves earlier successful ids and versions. Stale upload completion does not update a newly rendered route.
- **Stale async navigation is safe.** Successful saves update a captured detail element only when that exact element remains current and connected; an old completion invalidates through `onSaved(result,null)` without navigating or changing the new route's version. Conflict refresh likewise checks the captured page identity before exposing retry state.
- **Conflict retry preserves the draft without silently bypassing locking.** A conflict leaves the submitted version unchanged, displays the latest saved title/body or name/description, blocks retry, and requires an explicit “latest content reviewed” action before applying the fetched version. The regression test proves the intermediate retry does not call save.
- **Invite continuity is complete.** Routing forwards the invite to detail rendering and read mutations. Detail tabs and gallery pagination retain it, authenticated join mutations read it from the current query, and guest login links encode a return URL containing the invite. Successful pending membership remains discoverable server-side after join.
- **Membership controls follow local roles.** Moderators can review ordinary applicants/members but cannot remove moderator peers or promote/demote. Owner/admin-only promotion, demotion, transfer, and invite reset controls are scoped correctly. Leave/cancel controls are capability-driven, including versioned controls in My Groups, and owners are not offered leave.
- **Closed and pending states are read-only where required.** Closed detail inspection remains available without event, comment-delete, post, membership, notify, or leave mutations. Close is offered only for approved groups; rejected owners can edit/resubmit.
- **Events use the site's Korea-local wall time consistently.** Stored ISO instants are converted to `Asia/Seoul` for display and edit form values. `datetime-local` submissions are interpreted as Korea time and serialized back to an ISO UTC instant, avoiding the executor/browser host timezone.
- **Approved surface is present.** Creation, review, settings/resubmit/close, membership review and ownership transfer, posts/gallery/notices/comments/moderation/reporting, events/RSVP, notification preference/read state, invitations, pagination, and notification rendering have usable forms or routes with escaped plain-text output and server-compatible payloads.

## Verification

`node --test tests/group-client.test.js tests/group-pages.test.js`: **27 passed, 0 failed**.

No material frontend issue remains to block packaging.
