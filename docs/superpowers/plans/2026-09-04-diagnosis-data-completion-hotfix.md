# Diagnosis Data Completion Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the currently blank D03, D05, D07, D08, and D09 diagnosis panels from collected current-snapshot evidence without inventing numeric facts or increasing Redis history.

**Architecture:** Preserve one compact record per politician. Retain a bounded evidence-news subset, reconstruct local/policy displays from it, and join at most three competitors' compact current-snapshot records when serving a detail report. Use official profile election history when numeric election results are unavailable and render unavailable numeric subfields as absent rather than fabricated.

**Tech Stack:** Node.js ES modules, built-in `node:test`, Redis command repository, server-rendered HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-09-04-evidence-routed-intelligence-engine-design.md`

## Global Constraints

- No new paid API.
- Keep only the current Redis snapshot and compact reconstruction inputs.
- Never convert population structure into politician support percentages.
- Never fabricate vote rates, margins, opponents, policy progress, or regional results.
- Do not include politician photos or other image assets in the patch ZIP.

---

### Task 1: Preserve bounded local and policy evidence

**Files:**
- Modify: `lib/intelligence-storage.js`
- Modify: `lib/intelligence-service.js`
- Test: `tests/intelligence-service.test.js`

**Interfaces:**
- Consumes: `draft.raw.news.items`
- Produces: `stored.input.news.evidenceItems` with at most eight unique current-snapshot articles

- [x] Write a failing test proving local and policy articles outside the representative ten survive compact storage.
- [x] Run `node --test tests/intelligence-service.test.js` and confirm failure.
- [x] Select local/policy/election evidence by title, cap it at eight, omit descriptions, and merge it into hydrated news without duplicate URLs.
- [x] Run the service tests and confirm pass.

### Task 2: Populate local, campaign, and policy display contracts

**Files:**
- Modify: `lib/intelligence-diagnostics.js`
- Modify: `src/views/politicians.js`
- Test: `tests/intelligence-diagnosis-display.test.js`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: `context.ageSex`, `person.electionLabel`, `person.terms`, and retained evidence news
- Produces: non-empty D03 population, D08 official profile history, and D09 policy rows when observed evidence exists

- [x] Write failing tests for population structure, profile election history, and policy evidence outside the representative ten.
- [x] Run the targeted tests and confirm failure.
- [x] Map official population context to a clearly labelled electorate structure, allow nonnumeric official election history rows, and group policy evidence by normalized policy title.
- [x] Render numeric campaign charts only for rows that actually contain official numeric values.
- [x] Run the targeted tests and confirm pass.

### Task 3: Join current-snapshot competitor evidence

**Files:**
- Modify: `lib/intelligence-service.js`
- Modify: `src/views/politicians.js`
- Test: `tests/intelligence-service.test.js`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: target report's D05 selected IDs, current snapshot drafts, and ranking `byId`
- Produces: D05 `people` rows with real rank, search, news, frame, agenda, and available election fields

- [x] Write a failing service test showing three rival rows are populated from their own compact drafts.
- [x] Run it and confirm failure.
- [x] Batch-read only the selected rival records, reconstruct them, and merge their observed metrics into the target D05 contract.
- [x] Replace hard-coded D05 “데이터 부족” cells with values from each row while retaining an unavailable state per missing field.
- [x] Run service and view tests and confirm pass.

### Task 4: Show complete media names

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: D07 `sourceSpread` and `concentration`
- Produces: accessible full source-name labels without ellipsis

- [x] Write a failing render/CSS test proving full media names remain visible.
- [x] Run it and confirm failure.
- [x] Add a full-name legend and remove source-name ellipsis from the concentration layout.
- [x] Run targeted tests and confirm pass.

### Task 5: Verify and package

**Files:**
- Create: `JCS_0_0_31_7_DIAGNOSIS_DATA_COMPLETION_HOTFIX.md`
- Create: `JCS_0_0_31_7_DIAGNOSIS_DATA_COMPLETION_MANIFEST.txt`
- Create: `JCS_0_0_31_7_DIAGNOSIS_DATA_COMPLETION_PATCH.zip`

**Interfaces:**
- Consumes: all modified source and test files
- Produces: source-only patch ZIP

- [x] Run `npm test` and record the exact pass/fail counts.
- [x] Check the ZIP file list for image extensions and reject packaging if any are present.
- [x] Build the patch ZIP from the manifest only and run `unzip -t`.
