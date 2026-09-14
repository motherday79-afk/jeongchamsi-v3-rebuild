# JCS CAMPAIGN 157 independent final review

**Final disposition: all reported findings resolved. No open Critical, Important, or Minor findings from this review. Ready for packaging within the reviewed scope.**

The sections below preserve the initial findings and follow-up history; their original recommendations are superseded by the final resolution at the end.

Reviewed the campaign model/service/HTTP boundary, client/routing, editor/event handlers, board/detail renderers, scoped CSS, and app/gateway/icon wiring against the approved implementation plan. Read-only review; no source changes. Browser access was not attempted. Targeted Node event/model/render probes substantiated the findings below. Parent is separately verifying the primitive Redis adapter and release packaging.

## Critical

None found in the reviewed code.

## Important

### 1. First draft save discards edits made while the save request is pending

Locations: `src/ui/campaign-interactions.js:24,35`; `src/app.js:264-267`.

Only submit buttons are disabled during saving; text inputs and repeat-row controls remain editable. The handler captures `FormData` before awaiting the request. For a new campaign, a successful draft save always navigates to `/campaigns/:id/edit`, where a fresh server-rendered editor replaces the form. Anything typed after the captured request is silently discarded. Existing-draft save deliberately returns a null route and preserves those edits, so the protection already present for subsequent saves misses the first save.

Node event probe: request headline was `Before request`; live headline after a simulated in-flight edit was `Typed after request`; successful callback still received `/campaigns/c1/edit`. The app callback navigates and reloads the earlier saved record.

Requested correction: preserve the same form and its unsent edits after first save while updating the record id/version and URL, or prevent all form editing during a transition that will replace it. A stale save response must also avoid navigating away from a different route the administrator opened while the request was pending.

### 2. Publishing a future campaign ends on a not-found page

Locations: `src/ui/campaign-interactions.js:24`; `src/core/campaign-model.js:49-56,74-77`; `src/core/campaign-routing.js:18-23`.

Publish always navigates to the public `/campaigns/:id` route. A valid campaign with a future KST start date correctly becomes `scheduled`, and `publicCampaign` correctly returns null until that date. The route requests the public detail even for administrators and renders the not-found page. Thus every successful scheduled publication presents a failure screen and no editor/management recovery link.

Node model probe confirmed a public record with dates `2099-01-01` to `2099-02-01` has state `scheduled` and public detail null.

Requested correction: inspect the state returned by save and route scheduled publications to management or the editor with an explicit scheduled-success message; retain the public-detail redirect for currently public/archive results.

## Minor

### 3. Explicitly ended campaigns lose the ability to become private in the editor

Location: `src/views/campaign-editor.js:31` (actions markup gated by `published&&!ended`).

The shared condition hides both the End and Hide buttons after `endedAt` is set. These campaigns remain publicly readable in the archive, and the server still allows the `hide` operation, but the administrator can no longer request it through the UI. The remaining Publish action retains `endedAt`, so it does not restore those controls.

Node render probe confirmed an ended published record renders no `data-campaign-operation="hide"` while still rendering Publish.

Requested correction: render Hide for all published records (subject to visibility if desired); gate only End on `!ended`.

## Positive checks and limits

- Server role checks cover edit/manage reads, writes, deletes, and uploads; public reads use only published content.
- Draft save preserves the previous published snapshot, and published numbering/history use the same CAS commit boundary.
- Publication dates use KST midnight and inclusive end-day semantics; scheduled content stays private to edit/manage.
- Rendered user fields are escaped and supported URL protocols are constrained.
- Campaign CSS is scoped to campaign roots. Inspected main app changes add campaign routing/rebinding and the extra more-menu item; no campaign fixture was seeded. Banner and asset preservation is covered by the parent's packaging audit.
- Minimal editor and unregistered support suppression were treated as intentional scope decisions, not review defects.
- This review does not claim browser visual verification or live production API/storage verification.

Recommendation: fix both Important findings before release; the Hide-button correction is small and should be included if possible.

## Follow-up review disposition

Re-read the updated editor interactions/actions, HTTP error projection and video URL validator. Ran `node --test tests/campaign-editor.test.js tests/campaign-routing.test.js tests/campaign-http.test.js`: **22 passed, 0 failed**.

- Original Important 1, first-save typing loss: corrected by capturing FormData before locking all current form controls, then restoring each control's original disabled state. Existing-draft saves continue to preserve the form. Its related detached-form navigation condition below remains open.
- Original Important 2, scheduled publication: corrected; `campaignTargetRoute` directs scheduled results to management and the status text identifies scheduled publication.
- Original Minor 3, ended Hide: corrected; published records retain Hide while End alone is omitted for explicit ended records.
- New lock serializes upload/save requests and guards campaign identity event handling; failed operations restore prior disabled states. HTTP unknown exceptions become a generic 500 response, and YouTube parsing applies the shared URL validator first.

### Remaining Important: detached save response can replace a different active editor

`src/ui/campaign-interactions.js:35` still calls `onSaved` unconditionally after await; `src/app.js:264-267` still navigates unconditionally. The form lock does not disable the management link or shell navigation. Start saving new A, navigate to another edit page B while pending, and enter content in B; A's late response navigates to A and replaces B. Check that the originating form is still connected/current before applying its navigation result. Cache invalidation can still happen for a completed server write.

### Additional Important: late autocomplete suggestions can mutate locked identity

`src/ui/interactions.js:179-180` assigns selected name and hidden personId before emitting the custom selection event that the campaign guard checks. Its async suggestion request can finish after `lockControls` snapshots existing controls and insert newly enabled result buttons. Clicking those suggestions changes identity despite the campaign lock, while its profile patch is correctly suppressed, leaving mismatched name/personId versus profile/photo. Check disabled/busy status before the shared autocomplete selection's initial field assignments, or otherwise block selection before mutation.

Follow-up recommendation: the original three direct symptoms are corrected. Resolve the two concrete pending async conditions above before final release signoff.


## Final resolution verification

Reviewed only the final race corrections and their focused regressions, as requested.

- Detached save completion now passes a null navigation target when `form.isConnected === false`. The success callback still runs, allowing cache invalidation without redirecting the active page.
- Shared autocomplete selection checks `input.disabled` before any selected name/personId assignment. A late search response also closes without showing results when its input is disabled. These checks prevent mutation before the campaign-specific event guard.
- Ran `node --test tests/campaign-editor.test.js tests/campaign-autocomplete-lock.test.js`: **16 passed, 0 failed**. The tests exercise both autocomplete conditions and a disconnected editor's pending save, alongside the corrected scheduled publication, end/hide controls, and complete form lock/unlock behavior.

All initial and follow-up findings are closed. No further source changes or broader checks were made in this final pass. Browser and deployment verification remain outside this review.
