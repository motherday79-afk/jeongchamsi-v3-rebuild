# Activity Points 178 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Award approved member activity points safely and expose member guidance and administrator controls.
**Architecture:** Shared reward policy and per-member records augment existing Redis CAS transactions. Existing point wallet remains the spendable total; activityCredit and activityDebt protect recharge funds. Member rendering consumes server reward metadata, while administrator controls remain role gated.
**Tech Stack:** Existing JavaScript ESM, Redis Lua CAS, Node test runner; no new dependencies.
**Spec:** docs/superpowers/specs/2026-09-16-activity-points.md

## Global Constraints
- Defaults: posts 100P, comments 50P, daily 2000P, post minimum 50, comment minimum 15, cooldown 30 seconds; KST calendar day.
- Keep current /workspace/scratch/6b4498d07d47/jcs-172 directory; no Git recheckout, live writes, deployment, or collection.
- Protect all 177 paid entitlements and wallet fields. Sample/admin activity excluded. Preserve existing design and access controls.
- All source and tests ship as 178 PATCH and full ZIP, baseline177.

### Task 1: Atomic activity rewards, integration, and administrator operations
**Files:** Create lib/activity-points.js and tests/activity-points-178*.test.js; modify lib/community-service.js, lib/group-service.js, lib/group-http.js, lib/participation-admin.js, lib/person-publication.js, api/gateway.js and targeted existing test storage doubles as necessary.
**Consumes:** createCommunityService({command,now,makeId}), createGroupService({command,now,idFor}), createPointService({command,clock}), publishOnePerson wallet billing branch.
**Produces:** activityRewards/activityAdmin status and activityReward creation receipt, activity-policy/activity-revoke/activity-restrict endpoints as specified.
- [ ] Write failing integration tests exercising real services with controlled Redis boundary: createPost('community',{title:'제목',body:validBody},member) credits 100; addComment credits50 at +30s; wallet fields unrelated to rewards survive.
```js
const post=await service.createPost('community',{title:'제목',body:validBody},member);
assert.equal((await pointService.wallet(member)).wallet.balance,100);
assert.equal(post.activityReward.credited,100);
```
- [ ] Run node --test tests/activity-points-178*.test.js and retain intended initial failure evidence.
- [ ] Implement normalization/repetition/idempotence/rate/cap/debt and CAS integration plus role-checked operational API.
```js
// Inside the same transaction as the new content, never a follow-up best-effort credit:
// validate account -> recheck request -> inspect policy/record -> compute reward ->
// mutate content + reward record + wallet + audit -> CAS all involved documents.
```
- [ ] Add behavioral tests for deletion/debt/charge protection and concurrency, groups, API authorization, then run covering tests including 175/177 billing and existing groups/community tests.
- [ ] Write implementation report with precise contracts, commands/output, files and limitations. No Git available; report and ZIP baseline provide record.

### Task 2: Member guidance and administrator management
**Files:** src/views/activity-points.js, src/ui/activity-points.js, css/activity-points-178.css (new); integrate src/app.js, src/core/content.js, src/ui/group-interactions.js, src/views/group-pages.js, src/views/community-ui.js, src/views/participation-pages.js, other actual MyPage/member-point renderers, index.html; behavioral tests/activity-points-178-ui.test.js.
**Consumes:** Task1 response contract. Consult its report before implementation.
**Produces:** member pre-submit hints and receipts; day/cap/debt/ledger display; admin policy/revoke/restrict forms and suspect queue.
- [ ] Write failing renderer/handler tests for role separation, escaping, dynamic policy, excluded receipt reasons, stable request identifiers and controls.
```js
assert.match(renderActivityHint({policy:{postPoints:100},earnedToday:750,dailyLimit:2000},'post'),/750/);
// Actual tests exercise final exported renderer APIs and submitted payloads, not source grep.
```
- [ ] Run focused tests and confirm intended failure before implementing.
- [ ] Implement with current styling and server-derived data. Preserve request tokens on ambiguous failures, refresh totals after creation; do not claim success on failed storage.
- [ ] Run focused UI/core client tests and report output. Check static light/dark contrast and mobile layout; do not bypass browser restriction.

### Task 3: Integration review, release, and archives
**Files:** src/core/release.js, transitive query versions/index.html, docs/releases/JCS_0_0_31_178.md, verification/activity-points-178/*.
- [ ] Review diffs against177 for scope, security, concurrency and visible UX. Fix material findings and run covering tests.
- [ ] Bump changed module dependency queries to178, run npm test and syntax/deployment gates.
- [ ] Produce archives using baseline177 and verify byte parity of overlay, asset preservation and no unintended removals; persist both deliverables.
