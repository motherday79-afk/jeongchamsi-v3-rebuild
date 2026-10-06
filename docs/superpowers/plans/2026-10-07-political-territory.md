# 정참시 정치 쟁탈전 implementation plan

User authorizes replacement of mining game, implementation and deployment without further questions. User owns final visual/play acceptance. Do not run browser QA. Preserve unrelated working changes and existing financial records.

## Product decisions
- `/mine` becomes the new political territory game; no mining features or mining API remains active.
- Two shared territories: Blue House and National Assembly. Registered party selection locks for a weekly KST round. Neutral initial ownership.
- Policy proposal / press conference / scrutiny and corresponding amendment / rebuttal / disclosure use points and regenerating political activity energy; server validates roles and balances.
- Shared party policy / media / research offices can be upgraded with existing JCS points, with bounded levels per round.
- Server resolves threshold + lead + hold time ownership, protection cooldown, round rollover, public logs and actor contribution. Building accents reflect owning party colors. No real-world political claims or real voting outcomes.
- Public spectating; authenticated play. Existing point purchase/activity acquisition links. Never auto-charge for opening, joining or polling.
- New bright illustrated responsive dedicated app, accessible controls, no arrow suffixes on buttons.
- Old mining code/assets/routes/API removed from deployed tracked files; old stored records left inert, no redistribution or destructive wallet migration.

## Tasks
1. Backend: shared catalog, deterministic engine, authenticated HTTP wrapper and Redis atomic compare-and-set including wallet and idempotency. Files `src/core/territory-catalog.js`, `lib/territory-engine.js`, `lib/territory-service.js`, `lib/territory-http.js`. Own API contract written alongside modules. Necessary financial code checks only, final acceptance belongs to user.
2. Frontend: `territory/index.html`, `territory/app.js`, `territory/style.css`; consume GET/POST `/api/v3/territory`; state, party join, actions, upgrades, timer, errors, rules, point balance and history. Building art `/assets/territory/blue-house.webp` and `/assets/territory/assembly.webp`.
3. Integration: gateway, `/mine` rewrite, navigation, share metadata, point ledger label, remove tracked mine and mining-specific files. Keep no playable mining endpoint. New release cache versions.
4. Commit explicit changes, push, inspect deployment status and public API/version response (deployment readiness only, not visual/play QA).
