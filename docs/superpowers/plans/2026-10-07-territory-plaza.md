# Territory plaza implementation plan

**Goal:** Turn the territory scoreboard into a shared illustrated scene where real participants deploy mini avatars and perform political actions.
**Spec:** User-approved conversation: solo/group protest, symbolic fixed-duration fasting vigil, support visits, press conference and joint bill actions. User owns final visual/play QA; implementation and deployment authorized.
**Architecture:** Extend the existing Redis CAS game state with time-limited presence. Settle influence on the server deterministically, never in the browser. Render real server participants on animated civic plazas, preserve existing party selection, wallet and capture mechanics.
**Constraints:** White and colorful illustrated direction; no purple/gold wash; no button-arrow suffixes; no fake player counts; no real health/starvation score. Preserve wallet and receipt atomicity. No browser/play QA.

- [x] Backend: presence lifecycle, server-settled influence, real collective thresholds, appearance, paid collective actions, strict validation and focused regression tests. Own lib/territory*, src/core/territory-catalog.js, tests/territory*, docs/territory-api.md. 17 focused tests pass; code review found no blocking issue.
- [x] Frontend: scene module with animated mini avatars, solo/group/vigil/support/press/bill compositions and actual user interaction; integrate app, scene controls and selection, countdowns, recoverable mutations. Own territory/*. Static contract review and syntax checks pass; no browser QA.
- [x] Assets and integration: create matching colorful avatar artwork, update homepage entry and release, inspect integration and required server checks. Six characters with standing and seated artwork. Release 463 prepared for exact-file commit.
- [ ] Deployment: verify production release, public endpoint and scene resources only; user performs final screen/game review.

Ruling: Existing authorized implementation and deployment request permits proceeding without additional approval gates. Continue in current task checkout to preserve existing work; unrelated modified poll-push plan must remain untouched.
