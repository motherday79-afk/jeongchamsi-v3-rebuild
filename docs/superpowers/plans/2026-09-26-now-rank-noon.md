# NOW Rank noon refresh implementation plan

**Goal:** Refresh operational NOW Rank once daily starting at 12:00 Asia/Seoul, without an open admin browser.
**Approval:** User selected noon after approving the proposed collect → validate → publish flow. Implementation and deployment authorized by the ongoing workflow.
**Architecture:** Vercel cron at 03:00 UTC starts a persisted Redis job. One bounded collection/publication step per authenticated server invocation; waitUntil and authenticated POST continuations carry remaining work. Existing atomic snapshot publication is reused. Production CRON_SECRET already exists (name verified; value never read).
**Tech stack:** Existing Node/Vercel/Redis, @vercel/functions waitUntil.

## Constraints
- Existing manual rankings and BGM remain unchanged.
- Only publish after complete collection and validation; retry failed people once, then retain the live snapshot on failure.
- Require successful ranking source collection for scheduled jobs. Preserve existing manual collection semantics.
- Deduplicate date/start and step replay. Bound lifetime, chain length and retries.
- Serialize scheduled work against manual full collection/publication through a shared lease.
- All endpoints authenticate before storage access. Continuations use a fixed first-party origin, never request Host or query-provided URLs; never follow redirects with credentials.
- No claim of exact minute guarantees on Hobby; noon is the scheduled start, completion is later.
- Show schedule and latest attempt in existing admin status; show published timestamp on NOW Rank page.

## Steps
- [x] Add failing tests: noon UTC conversion, auth fail closed, duplicate triggers/steps, successful chain, retry then abort, manual conflict, continuation failure and preview guard.
- [x] Implement persisted scheduler and HTTP orchestration, add cron, integrate shared lock and source validation.
- [x] Add timestamp/status copy and release documentation.
- [x] Run targeted tests, syntax/diff checks and offline endpoint chain simulation.
- [ ] Commit and deploy; verify production deployment, cron registration and unauthorized endpoint behavior. User does visual QA.

## Review focus
- Failure must not replace published rankings or leave active publication locks indefinitely.
- A replayed callback must not advance a later step twice.
- An old callback cannot resume or mutate a new day's run.
- Partial source responses must not turn every rank into zero and still pass.
- Existing scheduled human poll at 08:00 UTC is preserved.

## Implementation ledger
- 32 targeted tests pass. 8 pre-existing admin-view failures reproduced from HEAD sources and documented separately; not introduced here.
- Fresh-context review found partial news coverage acceptance and dropped busy callbacks. Both corrected with regression tests. Strict coverage is checked before history merging; busy callbacks are re-delivered with bounded delivery attempts.
- Ruling: reuse existing production checkout, no unrelated isolation/deployment work; clean starting status verified. Existing CRON_SECRET reused without revealing or rotating it.
