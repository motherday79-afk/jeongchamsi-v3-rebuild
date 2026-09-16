# Activity points 178 — frontend Task 2 report

Implemented Task 2 only. Backend services, backend tests, dependencies and release/version tooling were not changed. No live calls, deployment, collection, browser, Playwright or Git operations were performed.

## Result

- Eligible community, IT’S ME, cage participation, approved real-group post/gallery and comment forms now show the current server policy before submission. Hints state the current award, meaningful-character threshold, shared cooldown, gross KST daily allowance and remaining allowance. They explicitly say short valid content can still be submitted without earning points. Edit, example, notice, event, inquiry and administrator forms do not promise rewards.
- Hint hydration only runs when a scoped eligible placeholder exists. It ignores late responses after navigation or account identity changes and runs again after history snapshot restoration.
- Ordinary and group authoring forward backend-compatible request IDs. Unknown outcomes preserve the token and entered content for a safe retry. A proven rejection keeps the token for an unchanged retry and rotates it after the user edits the payload. Stored request state is namespaced by submitting user.
- Credited and excluded creation receipts persist through navigation/rerender. Credited receipts distinguish gross earned points, wallet credit and debt offset. Exclusions explain minimum length, repetition, duplicate content, daily cap, restriction, disabled policy or ineligible scope. Delete receipts use aggregate `recovered` and `debtAdded` fields, including cascade reversals. Saved feedback is account-scoped and is discarded after logout/account switch.
- HTTP 429 activity cooldown failures show the backend `retryAfterSeconds`; failed storage/network outcomes never claim content or point success.
- MyPage, Point Shop and administrator member panels share activity/reversal labels. Activity clawbacks are excluded from cumulative spending. Activity ledger rows disclose earned, credited and offset amounts. Daily KST gross earnings, remaining allowance, debt and active restriction details are shown.
- `/points?view=activity` is linked from the administrator menu. It exposes strict typed policy settings with a required reason, a bounded suspicion queue labeled as unconfirmed review signals and the activity audit list. Suspicion links filter and open the matching member. The member panel loads successful activity history 25 rows at a time and exposes deliberate per-event revoke plus 0–720 hour restriction/clear controls.
- The new CSS stays scoped to activity components, uses dark readable text on white/light panels and collapses summary, policy and member controls to one column at 720px.

## TDD evidence

Initial failing command:

```sh
node --test tests/activity-points-178-ui.test.js
```

`qa178/frontend-red.log`: exit 1, one failing test file because `src/views/activity-points.js` did not exist. This was captured before production implementation. The test file already specified dynamic server-policy hints, exclusion receipts, earned/credited/offset semantics, ledger spending, role separation and escaping, typed admin payloads, stable request recovery, persistent reversal feedback, stale hydration and all three point surfaces.

During the red/green cycle, the implemented shared modules produced 6 passes and 3 expected integration failures: group request ID forwarding, stale placeholder restoration and legacy ledger rendering. Those boundaries were then wired without weakening the expectations.

Final focused command:

```sh
node --test tests/activity-points-178-ui.test.js tests/group-pages.test.js tests/group-client.test.js
```

`qa178/frontend-green.log`: **39 tests, 39 pass, 0 fail, 0 skipped**, exit 0. This covers the new renderer/handler contracts plus existing group rendering, optimistic mutation, conflict, upload and exact client-envelope behavior.

Syntax command:

```sh
node --check src/app.js && node --check src/views/activity-points.js && node --check src/ui/activity-points.js && node --check src/views/community-ui.js && node --check src/views/group-pages.js && node --check src/views/stage1.js && node --check src/views/participation-pages.js
```

Exit 0 with no output.

## Modified files

New production files:

- `src/views/activity-points.js`
- `src/ui/activity-points.js`
- `css/activity-points-178.css`

Integrated production files:

- `src/app.js`
- `src/core/content.js`
- `src/ui/group-interactions.js`
- `src/views/group-pages.js`
- `src/views/community-ui.js`
- `src/views/participation-pages.js`
- `src/views/stage1.js`
- `index.html`

Tests:

- `tests/activity-points-178-ui.test.js`

`src/core/group-client.js` was intentionally unchanged: its existing exact mutation-envelope contract already preserves `input.requestId`, and the focused group-client test confirms this.

## Exact flows

1. A signed-in eligible member opens a fresh authoring form. The UI fetches current wallet/activity status only after finding an eligible hint mount and renders current policy values.
2. On submit, the UI assigns or reuses an account/form-scoped request ID. Success stores the receipt, clears pending request state and navigates/rerenders; the next screen consumes an accessible receipt. A known rejection leaves the form intact; an unknown outcome retains the token for the same retry.
3. Deleting owned eligible content stores the aggregate reversal receipt. The next render reports recovered wallet points and any added activity debt without treating the clawback as spending.
4. Members see gross daily recognition, remaining KST allowance and activity debt on MyPage and Point Shop, with truthful activity/reversal ledger labels.
5. An administrator selects **활동 포인트** from the admin menu, edits integer policy fields and strict enabled checkbox, supplies a reason and saves. The same screen presents unconfirmed suspicion signals and audit rows.
6. From a suspicion signal or **회원관리**, the administrator opens the member panel. The panel automatically loads wallet/activity data, pages successful events, revokes a selected event with a reason or sets/clears a period restriction with a reason. Existing backend role enforcement remains authoritative and the UI also hides admin controls from non-admin sessions.

## Limits

- Browser HTTP/file access was previously denied, so no browser or live visual QA is claimed. Layout verification is limited to DOM behavior tests, source inspection of scoped selectors, explicit foreground/background colors and the mobile media rule.
- No live Redis, real account, real award, payment, deletion, deployment or network collection was used.
- Root Task 3 owns the full repository suite, release dependency query propagation, release note/archive work and final integration review.

## Full-suite compatibility fix

Root's first release-bumped full run reported **459 tests, 457 pass, 2 fail**. Both failures were in `tests/cage-entry.test.js` and were frontend compatibility issues:

- The successful-opinion test extracted and executed one physical source line from `src/app.js`. Activity feedback now has to be captured before the common render, so the correct render moved outside that extracted line even though the actual application flow remained ordered. The brittle source-slicing harness was replaced with the exported `cageOpinionCompletion` production boundary. It verifies cage feedback, direct-entry query consumption, activity-feedback capture and exactly one render in their actual order.
- Failed authoring normalization added `status: undefined` and `retryAfterSeconds: undefined` when a controlled client returned only an error. The exported `authoringResult` boundary and remote content client now add optional fields only when present. A rejected cage opinion retains its chosen camp and body and performs no feedback, route or render effect.

Failing-first command after replacing the brittle harness:

```sh
node --test tests/cage-entry.test.js
```

Exit 1 because the new production boundary exports did not yet exist.

Final focused command:

```sh
node --test tests/cage-entry.test.js tests/activity-points-178-ui.test.js tests/group-client.test.js tests/group-pages.test.js
```

`qa178/frontend-fix-fullsuite.log`: **54 tests, 54 pass, 0 fail, 0 skipped**, exit 0. Fresh `node --check` runs for `src/app.js`, `src/core/cage-entry.js`, `src/core/content.js`, `src/ui/activity-points.js` and the revised cage test also exited 0 with no output.

## Final review fix wave

The four Important findings in `qa178/final-review.md` were fixed together:

- Group request storage keys now include group, operation and target post identity. New-post state is isolated per group, comment state is isolated per group/post, unknown same-target retries retain their request ID, and completing one target clears only that target.
- Hint hydration uses per-mount ownership. A superseded request performs no DOM write; a lone request whose account changed clears only nodes it still owns, so it cannot restore old private totals or overwrite a newer account's successful hydration.
- Changing a new group post to `notice` hides the reward hint; changing back to `post` or `gallery` reveals the already hydrated current policy. `.activity-hint[hidden]{display:none}` makes that contract effective despite the component's grid display. Existing edit, admin and example forms remain without a new reward promise.
- Ordinary post/comment deletion captures the submitting session identity before awaiting the API. The shared `rememberSubmissionFeedback` boundary rejects a late receipt after an account switch and preserves same-account aggregate recovered/debt feedback.

Failing-first behavioral evidence is in `qa178/frontend-final-red.log`. The initial focused run failed on the missing shared deletion boundary and the old group request keys/kind behavior; the appended CSS contract test then failed against the former grid-only stylesheet before the scoped hidden rule was added.

Final focused command:

```sh
node --test tests/activity-points-178-ui.test.js tests/group-pages.test.js tests/group-client.test.js tests/cage-entry.test.js
```

`qa178/frontend-final-fix.log`: **59 tests, 59 pass, 0 fail, 0 skipped**, exit 0. Fresh `node --check` runs for `src/ui/activity-points.js`, `src/ui/group-interactions.js`, `src/views/group-pages.js` and `src/app.js` also exited 0 with no output. No browser or live visual QA is claimed.
