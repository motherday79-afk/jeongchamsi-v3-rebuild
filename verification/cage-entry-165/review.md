# Independent review — JCS 0.0.31.165

Reviewed the bounded release-164 to release-165 diff and its surrounding navigation, authentication, community form, countdown, and asset code. Source checkout was read-only throughout this review. No browser, server, port, live API, database, deployment, or preview renderer was used.

## Strengths

- The two artwork halves use separate accessible links with explicit camp routes, without altering the underlying image, percentages, title geometry, or font assets.
- An explicit compose route checks the requested item ID and accepted camp before selecting the radio and exposing the existing writer; ordinary detail routes retain manual selection.
- The search mark is a native non-submit button and its delegated listener is bound only once.
- Successful opinion submission consumes the camp/compose query while preserving the existing feedback flow.
- All 47 baseline asset files were SHA-256 compared to the release-164 archive and match byte for byte.

## Resolved Important finding

**A failed login discards the selected CAGE return route.**

- Location: `src/app.js:378-379` (pre-fix), with the actual 401 contract in `api/gateway.js:188`.
- A guest arriving at `/login?next=<encoded cage compose route>` receives `{ok:false,status:401,error:'INVALID_LOGIN'}` for an incorrect password. The generic 401 branch navigates to plain `/login`, removing `next` and the original form error. A successful second attempt then falls back to `/mypage`, so the selected CAGE and camp are lost.
- Reproduced independently for both camps by executing the actual adjacent 401 and success branches against `createNavigation` with an in-memory location/history. Observed routes: `/login`, then `/mypage`.
- Evidence: `qa165/review-auth-repro.mjs` (asserts the observed pre-fix behavior).
- Fix: leave a failed login on the existing form/URL by excluding login submissions from the generic 401 redirect. Add a regression that exercises a real 401 failure followed by success, covering both branches together.

No Critical or additional concrete Minor findings identified in the reviewed scope.

## Verification

`node --test tests/cage-entry.test.js tests/navigation-restore-interactions.test.js tests/home-promos.test.js` passed: 27 tests, 0 failures. These pre-fix tests cover direct success but did not catch the real 401 retry path because their failure input omitted HTTP status and their harness extracted only the success branch.

Timer CSS uses `pointer-events:none`, so the countdown does not intercept the split click areas. Existing timer expiry removes the join form; compose focus safely exits when its target no longer exists. The normal generated post IDs flow through navigation and the item-ID equality guard consistently. Assets, title rendering geometry, and percentage calculation were checked against the release diff.

## Assessment

**Ready in the reviewed navigation/authentication scope.** The login retry finding is fixed and independently verified. The main interactions are bounded and preserve the approved assets. Browser visual verification was deliberately not performed under the explicit task restriction; the coordinator is separately validating the authored CSS cascade.


## Fix verification

Re-read the updated `src/app.js:378` and confirmed that the generic HTTP 401 redirect now excludes login forms. Fresh execution of `node qa165/review-auth-regression.mjs` passed for both progressive and conservative selections using the real adjacent application branches and `createNavigation`; failed authentication preserves the original login URL, and a successful retry navigates only to its intended CAGE compose route. The saved pre-fix `qa165/auth-red.txt` shows the corresponding assertion failing on the lost `next` parameter.

A fresh `node --test tests/cage-entry.test.js` also passed (15 tests, 0 failures). No unresolved review findings remain in this scope.
