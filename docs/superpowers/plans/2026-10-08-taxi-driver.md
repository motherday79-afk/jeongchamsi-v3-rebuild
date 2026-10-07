# JCS 리얼택시 implementation plan

**Goal:** Replace the territory game at /mine with an anonymous political passenger conversation game in retro webtoon style.
**Approved design:** 12 registered politicians; 5–7 sourced conversation beats each; listen/like/drop-off choices; identity reveal with original source links; active visible ride duration and heard-card count; first/repeat ride distinction; game-only history, no politician detail integration.
**Architecture:** Standalone /taxi app and existing /api/v3 gateway endpoint. Curated source-backed paraphrases, never fabricated quotes. Random balanced shuffled deck; passenger identity withheld from normal UI until finish. Signed-in users store private ride history with current account; guests can play and retain device history. Wall time excluded while hidden/paused; time is a reading record, never a support score. No point charges or political preference inference.
**Style:** Flat retro comic/ink outlines, warm limited palette, halftone city, moving 2D taxi and anonymous silhouette, readable speech balloons. No old 3D illustrations or combat UI.

- [x] Content: verify 12 registered IDs and enough balanced actual statements/bills; write lib/taxi-passengers.js with per-beat sources/date/context/type and neutral paraphrase, photo if available; integrity tests.
- [x] Backend: trip start/choice/pause/resume/finish + private history, idempotent state changes, server time capped by heartbeats, shuffled rounds without repeats, hidden identity in active responses, no financial changes. Coordinate exact contract before frontend.
- [x] Frontend: drive/stop/board/converse/reveal/next loop, active-time pause on visibility, retro animated scene, choices, source reveal, private ride journal, mobile layout/reduced motion.
- [x] Integration: delete tracked territory runtime/assets/styles/tests, old territory API410; /mine opens taxi; homepage entry/metadata/release465. Preserve historical wallets/records and unrelated modifications.
- [ ] Required code/data checks, exact-file commit and deploy. Read-only production readiness; final visual/play QA belongs to user.

Ruling: User authorized replacement and prior implementation/deployment without additional questions. Reuse current active checkout. Source accuracy takes precedence over rushing invented dialogue; statements paraphrased and labeled at reveal, no identity clues inserted into conversation.
