# Approved Diagnosis Interactions, Profile Header, and Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved administrator politician detail design use real period datasets, reliable controls, one consolidated profile header, exact approved typography, and a verified final ZIP.

**Architecture:** Preserve the current dirty worktree and extend the existing intelligence display contract. Period-specific values are produced in `lib/intelligence-diagnostics.js`, rendered as complete period panels in `src/views/politicians.js`, and controlled by one delegated interaction handler in `src/ui/interactions.js` so rerenders cannot detach controls. The administrator-only legacy hero is removed while its approved fields and actions move into the report header.

**Tech Stack:** Native JavaScript ES modules, server-rendered HTML strings, scoped CSS, Node.js built-in test runner.

**Spec:** User-approved scope in the current conversation, confirmed on 2026-09-06.

## Global Constraints

- Do not clone, checkout, reset, initialize, or pull from GitHub.
- Preserve every existing change in `/workspace/scratch/4d589e043302/jeongchamsi-v3-rebuild`.
- Use observed or stored data only; do not invent period counts.
- Apply the administrator profile-header change to every politician rendered with administrator intelligence.
- Match font sizes to `/workspace/jcs-diagnosis-01-10-summary.html`.
- Run focused tests, the full test suite, render verification, then package release `JCS_0_0_31_19`.

---

### Task 1: Period data contracts

**Files:**
- Modify: `lib/intelligence-diagnostics.js`
- Test: `tests/intelligence-diagnosis-display.test.js`

**Interfaces:**
- Consumes: `input.newsMetrics.periodCounts`, retained news rows, and competitor period fields.
- Produces: `display.people[].newsPeriods` for diagnosis 05 and `display.periods[]` containing full source summaries for diagnosis 07.

- [x] **Step 1: Write failing tests**

Add literal fixtures proving that all four competitor rows preserve distinct 24H/7D/30D counts and that media periods produce distinct article totals, source rankings, and major/non-major shares.

- [x] **Step 2: Verify the tests fail**

Run: `node --test tests/intelligence-diagnosis-display.test.js`

Expected: FAIL because competitor rows after the subject have no period counts and media has no period dataset array.

- [x] **Step 3: Implement the data contracts**

Normalize cumulative windows into `{label, articleCount, sourceCount, allSources, majorShare, nonMajorShare}` and preserve peer `newsPeriods` when present without generating replacements.

- [x] **Step 4: Verify the tests pass**

Run: `node --test tests/intelligence-diagnosis-display.test.js`

Expected: PASS.

### Task 2: Reliable period and disclosure controls

**Files:**
- Modify: `src/ui/interactions.js`
- Modify: `src/views/politicians.js`
- Test: `tests/diagnosis-interactions.test.js`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: `[data-jcs-period]`, `[data-jcs-period-panel]`, and `.jcs-media-toggle` markup.
- Produces: one delegated click handler per root that survives content replacement and updates visibility plus ARIA state.

- [x] **Step 1: Write failing interaction tests**

Add a fake DOM root whose registered click callback receives dynamically created period and toggle targets; assert that the selected media panel and its full list are changed after setup.

- [x] **Step 2: Verify the tests fail**

Run: `node --test tests/diagnosis-interactions.test.js tests/politician-diagnosis-rebuild-view.test.js`

Expected: FAIL because the existing implementation attaches listeners directly to the initial buttons and media markup has no period panels.

- [x] **Step 3: Implement delegated controls and full media panels**

Render 24H, 7D, and 30D media panels with unique list IDs. On a period click, update `aria-pressed`, value/panel visibility, and the Korean label. On a toggle click, hide or restore the list in the closest media panel and update text plus `aria-expanded`.

- [x] **Step 4: Verify the focused tests pass**

Run: `node --test tests/diagnosis-interactions.test.js tests/politician-diagnosis-rebuild-view.test.js`

Expected: PASS.

### Task 3: Consolidated administrator profile header

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/diagnosis-approved.css`
- Test: `tests/politicians.test.js`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: politician office, party, jurisdiction, role, terms, committee, ID, type, and ranks.
- Produces: one approved report-header identity block with the three actions; administrator detail HTML contains no legacy `person-detail-hero`.

- [x] **Step 1: Write failing header tests**

Assert that administrator HTML contains the office, party/jurisdiction, role/terms/committee, three actions, and ranks inside `jcs-report-head`, and contains no legacy hero.

- [x] **Step 2: Verify the tests fail**

Run: `node --test tests/politicians.test.js tests/politician-diagnosis-rebuild-view.test.js`

Expected: FAIL because the data and actions still live in the separate legacy hero.

- [x] **Step 3: Move the approved fields and actions**

Extend `approvedReportPerson()` and omit the legacy hero only for administrator intelligence, leaving member/public identity behavior intact.

- [x] **Step 4: Verify the focused tests pass**

Run: `node --test tests/politicians.test.js tests/politician-diagnosis-rebuild-view.test.js`

Expected: PASS.

### Task 4: Approved typography precedence

**Files:**
- Modify: `index.html`
- Modify: `css/diagnosis-approved.css`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: approved font declarations from `/workspace/jcs-diagnosis-01-10-summary.html`.
- Produces: the approved stylesheet loaded after general and hotfix styles, with scoped additions for the new header fields.

- [x] **Step 1: Write a failing stylesheet-precedence test**

Assert that `diagnosis-approved.css` loads after all general/hotfix styles and that critical report selectors retain the approved font-size values.

- [x] **Step 2: Verify the test fails**

Run: `node --test tests/politician-diagnosis-rebuild-view.test.js`

Expected: FAIL because the approved stylesheet currently loads before later hotfix styles.

- [x] **Step 3: Fix load order and scoped header typography**

Move the approved stylesheet link to the final stylesheet position and add only the new header selectors using the existing approved 18px, 12px, and 11px type scale.

- [x] **Step 4: Verify the focused test passes**

Run: `node --test tests/politician-diagnosis-rebuild-view.test.js`

Expected: PASS.

### Task 5: Release verification and ZIP

**Files:**
- Modify: `src/core/release.js`
- Modify: cache-busted imports and stylesheet URLs that still reference `0.0.31.18`
- Create: `JCS_0_0_31_19_APPROVED_DIAGNOSIS_INTERACTION_PROFILE_FINAL_MANIFEST.txt`
- Create: `JCS_0_0_31_19_APPROVED_DIAGNOSIS_INTERACTION_PROFILE_FINAL.zip`

**Interfaces:**
- Consumes: the fully tested current worktree.
- Produces: one self-contained release ZIP and checksum.

- [x] **Step 1: Set release `JCS_0_0_31_19` and cache keys**

Update the release constant and all current diagnosis/application cache keys from `0.0.31.18` to `0.0.31.19`.

- [x] **Step 2: Run complete verification**

Run: `npm test`

Expected: all tests pass with zero failures.

- [x] **Step 3: Generate and verify the administrator detail preview**

Generate the local preview and verify the 24H/7D/30D switching, media collapse DOM contract, and header/layout against the approved source. The cloud browser blocked the local URL by policy, so no bypass was attempted; focused interaction tests and exact stylesheet comparison provide the executable verification.

- [x] **Step 4: Build and verify the ZIP**

Package the current project without older ZIP artifacts or dependency directories; list the archive and calculate SHA-256.
