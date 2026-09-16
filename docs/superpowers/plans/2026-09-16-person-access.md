# Person-scoped 24-hour analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Paid single-person refresh grants 24-hour full analysis and eligible multi-person comparison.
**Architecture:** Persist a per-person grant in the existing member wallet, atomically with publication/debit. Project each HTTP report according to authenticated member grants; UI consumes server access metadata and independently retains administrator-only controls.
**Tech Stack:** Node ESM, vanilla HTML/CSS/JS, Redis compare-and-swap, node:test.
**Spec:** docs/superpowers/specs/2026-09-16-person-access.md

## Global Constraints
- Work in current directory; no Git recheckout, new dependencies, live collection, live charges, or deployment.
- 24 hours = 86400000ms after successful publication; administrator refresh never rewrites member grant.
- Ordinary read/compare does not write points. All grants are user/person scoped and checked server side.
- Existing purple/gold visual language and approved report layouts remain.

### Task 1: Atomic entitlement and authenticated report projection (root)
Files: new lib/person-analysis-access.js, modify lib/person-publication.js, lib/refresh-billing.js, api/gateway.js; tests/person-access-177.test.js and tests/person-access-api-177.test.js.
Interface: analysisAccess={personId,active,grantedAt,expiresAt,serverNow}; top-level report response and intelligence both carry it for members. Active paid report has accessTier='admin' but account role remains member. Quote includes same metadata; successful paid result includes grant metadata. Helpers readPersonAnalysisAccess(command,user,personId,now=Date.now()) and grantPersonAnalysisAccess(wallet,personId,requestId,now) own wallet analysisAccess map.
- [ ] Add failing tests for grant success, exact expiry, idempotency, user/person isolation and unchanged rights after administrator publication.
- [ ] Atomically set `wallet.analysisAccess[personId]={personId,grantedAt:publishedAt,expiresAt:publishedAt+86400000,requestId}` alongside debit.
- [ ] Recheck grant at HTTP projection time. Reject suspended authentication and never trust client supplied role/expiry. Preserve no-store.
- [ ] Verify failures cannot charge/grant and existing paid request retry cannot extend access.

### Task 2: Detail and comparison flows (frontend implementer)
Files: src/views/person-refresh.js, src/ui/person-refresh.js, src/views/politicians.js, src/views/politician-compare.js, src/app.js, src/core/navigation.js only if necessary; css/person-refresh-175.css; focused frontend tests.
Consumes Task 1 metadata defined above. No changes to lib/api/index/release.
- [ ] Add failing behavioral tests for top/bottom actions, paid report without admin controls, paid 2/3/4 comparisons, mixed/expired access gating and successful refresh automatic redraw.
- [ ] Upper refresh button opens accessible fee/confirmation UI at top without needing to scroll to bottom; bottom uses same charging handler. Show fee, balance, charge-on-success and 24h benefit; preserve quote failure/pending recovery.
- [ ] On successful paid refresh redraw detail automatically. Active access displays end time and remaining time and link to comparison. No charge for read/compare. Repeat paid refresh explicitly confirms fee.
- [ ] Use full existing report renderers for paid reports; account role alone controls admin operations. Only render deep comparison when every requested person successfully loads and has eligible report tier; mixed sets get unlock guidance without exposing locked full data. Ordinary 2-person comparison still works.
- [ ] Protect expired open tabs/history/session switches by removing expired paid markup, loading fresh server projection and avoiding old person/compare snapshots. Test lifecycle cleanup.

### Task 3: Review, regression and packaging (root + reviewer)
- [ ] Review backend and frontend scope/quality using changed-file package.
- [ ] Run focused suites and full node:test regression. Verify deployment trace includes new backend module.
- [ ] Bump changed browser module query versions and release to177, write release instructions and verification record.
- [ ] Compare against176 ZIP, verify176+patch equals177 full; save patch/full ZIPs persistently.
