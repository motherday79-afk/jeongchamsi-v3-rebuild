# Diagnosis Detail And Error Visibility Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the approved diagnosis visual/data defects, add safe member-role administration, and make collection failures actionable without increasing Redis history.

**Architecture:** Preserve the existing compact V5 snapshot pipeline. Normalize dates at ingestion, derive all diagnosis displays from stored evidence and collection time, enrich only bounded display contracts, centralize job retry/error metadata in the repository, and extend the existing admin user route rather than introducing new pages.

**Tech Stack:** Node.js ESM, node:test, Redis command adapter, server-rendered HTML/CSS.

**Spec:** Approved 11-item checklist in the 2026-09-04 conversation.

## Global Constraints

- Preserve the current dirty feature branch and all 0.0.31.7 changes.
- Do not add paid APIs, random values, duplicated snapshots, or image assets.
- Store bounded error/evidence details only.
- Use existing authentication, routes, components, and official/profile/news data.
- Package only changed source, tests, manifest, and handoff files.

---

### Task 1: Time-window and diagnosis display contracts

**Files:**
- Modify: `lib/intelligence-headlines.js`
- Modify: `lib/intelligence-analysis.js`
- Modify: `lib/intelligence-diagnostics.js`
- Test: `tests/intelligence-diagnosis-display.test.js`

**Interfaces:**
- Produces normalized ISO `news.items[].date` and a collection-time `referenceAt`.
- Produces D01/D06 windows, D02 two-level percentages, D03 linked evidence/overlap rows, D04 Korean labels, D06 persistence facts, and D09 current-stage state.

- [ ] Add failing tests for RSS dates, fixed age/sex totals, linked local issues, explicit persistence facts, and policy current stages.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement the smallest contract changes.
- [ ] Re-run focused tests until green.

### Task 2: Rendering and responsive styling

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`
- Test: `tests/politician-diagnostics-css.test.js`

**Interfaces:**
- Consumes the display contracts from Task 1.
- Produces the D02 stacked age/sex bars, D03 overlap tracks, D05 readable frame figures, D06 cumulative timeline, compact D07 values, D08 result matrix, and D09 active stage rail.

- [ ] Add failing markup/CSS assertions for each approved presentation rule.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement compact desktop/mobile markup and gradient styling.
- [ ] Re-run focused tests until green.

### Task 3: Election evidence completion

**Files:**
- Modify: `lib/intelligence-diagnostics.js`
- Modify: `lib/intelligence-storage.js`
- Test: `tests/intelligence-diagnosis-display.test.js`

**Interfaces:**
- Consumes official profile election records and directly evidenced vote-rate/margin/opponent facts.
- Produces normalized D05/D08 election rows without invented numeric values.

- [ ] Add failing tests for normalized election records and explicit unavailable states.
- [ ] Run focused tests and confirm expected failures.
- [ ] Map official election record fields and direct evidence into shared D05/D08 rows.
- [ ] Re-run focused tests until green.

### Task 4: Member administrator role control

**Files:**
- Modify: `lib/rebuild-store.js`
- Modify: `api/gateway.js`
- Modify: `src/core/auth.js`
- Modify: `src/views/stage1.js`
- Modify: `src/ui/interactions.js`
- Test: `tests/stage1.test.js`
- Test: `tests/gateway.test.js`

**Interfaces:**
- Consumes `{id, role}` on the existing admin users PATCH route.
- Produces server-enforced `member|admin` updates with self-demotion and last-admin protection and bounded audit metadata.

- [ ] Add failing server/store/view tests for grant, revoke, and safeguards.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement the server mutation and existing admin-page controls.
- [ ] Re-run focused tests until green.

### Task 5: Actionable collection failures and failed-only retry

**Files:**
- Modify: `lib/intelligence-service.js`
- Modify: `lib/intelligence-repository.js`
- Modify: `api/gateway.js`
- Modify: `src/core/auth.js`
- Modify: `src/views/stage1.js`
- Modify: `src/ui/interactions.js`
- Test: `tests/intelligence-repository.test.js`
- Test: `tests/intelligence-service.test.js`
- Test: `tests/intelligence-admin-view.test.js`

**Interfaces:**
- Produces bounded failure records `{personId,name,stage,code,details,at,attempts,retryable}`.
- Produces `retryCollectionFailures()` that preserves prior successes and retries only failed IDs.

- [ ] Add failing repository/service/view tests for details, grouping, report copy data, and failed-only retry.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement retry queue state and the existing admin intelligence route/button.
- [ ] Re-run focused tests until green.

### Task 6: Verification and PATCH ZIP

**Files:**
- Create: `JCS_0_0_31_8_DETAIL_AND_ERROR_VISIBILITY_PATCH.md`
- Create: `JCS_0_0_31_8_DETAIL_AND_ERROR_VISIBILITY_MANIFEST.txt`
- Create: `JCS_0_0_31_8_DETAIL_AND_ERROR_VISIBILITY_PATCH.zip`

**Interfaces:**
- Produces a source-only patch archive with no politician photographs.

- [ ] Run the complete `npm test` suite.
- [ ] Run syntax checks for every changed JavaScript file.
- [ ] Search for forbidden image extensions and unbounded error payloads in the archive input list.
- [ ] Create and inspect the ZIP, then compute SHA-256.
