# Diagnosis 01–10 Visual Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the administrator politician diagnosis report’s repeated prose blocks with the ten approved, evidence-led diagnosis visual modules while preserving collection, publication, role access, profile, and prescription behavior.

**Architecture:** `lib/intelligence-diagnostics.js` remains the central derivation layer and emits a compact `display` contract for each diagnosis. `src/views/politicians.js` renders that contract with diagnosis-specific functions, and `css/pages.css` provides compact responsive report styling. Existing public/member projections, storage compaction, and prescriptions remain intact.

**Tech Stack:** Node.js ES modules, server-rendered HTML strings, CSS, Node test runner.

**Spec:** Conversation-approved DIAGNOSIS 01–10 design summarized on 2026-09-04.

## Global Constraints

- Preserve current collection, publication, Redis compaction, authentication, profile, photo, and prescription behavior.
- Administrator diagnosis must use observed or derived current-project data only; no random values or invented election results.
- Do not persist article collections beyond the existing compact maximum.
- Remove repeated political meaning, current position, opportunity, risk, and per-topic JCS interpretation from the administrator diagnosis UI.
- Diagnosis 10 is `JCS 종합해석`, not `중장기 정치 성장 진단`.
- Desktop and mobile must both remain readable without fixed viewport layouts.

---

### Task 1: Central diagnosis display contract

**Files:**
- Modify: `lib/intelligence-diagnostics.js`
- Test: `tests/intelligence-diagnosis-display.test.js`

**Interfaces:**
- Consumes: existing `person`, `newsNarrative`, `eventClusters`, `cohorts`, `competitors`, `searchMetrics`, and official profile fields.
- Produces: `diagnosis.display`, a compact object whose `kind` equals `brand`, `demographic`, `local`, `support`, `competitor`, `risk`, `media`, `campaign`, `policy`, or `summary`.

- [x] Write failing tests asserting ten distinct display kinds, normalized demographic composition, three support segments summing to 100, and three-competitor cap.
- [x] Run `node --test tests/intelligence-diagnosis-display.test.js` and confirm failure because `display` is absent.
- [x] Add deterministic helpers for normalization, time buckets, evidence links, support composition, media aggregates, verified policy rows, and unavailable official-election states.
- [x] Attach one diagnosis-specific `display` object to each diagnosis without enlarging compact Redis input records.
- [x] Run the focused test and confirm it passes.

### Task 2: Administrator diagnosis-specific renderer

**Files:**
- Modify: `src/views/politicians.js`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: `diagnosis.display.kind` and its compact fields.
- Produces: semantic HTML marked with `data-diagnosis-layout="01"` through `"10"`.

- [x] Write failing view tests for every diagnosis layout and the approved visible labels.
- [x] Assert the administrator diagnosis area omits the removed repeated field labels.
- [x] Run the focused test and confirm failure against the old generic renderer.
- [x] Add escaped, diagnosis-specific render functions and route `renderAdminDiagnostic()` through them.
- [x] Keep existing public/member renderers and all prescription rendering unchanged.
- [x] Run the focused test and confirm it passes.

### Task 3: Compact responsive report styling

**Files:**
- Modify: `css/pages.css`
- Test: `tests/politician-diagnosis-rebuild-view.test.js`

**Interfaces:**
- Consumes: the new `jcs-dx-*` class hierarchy.
- Produces: compact desktop layouts and single-column or safe horizontal layouts below 760px.

- [x] Add CSS presence assertions for the ten module families and mobile breakpoint.
- [x] Run the focused test and confirm the style assertions fail.
- [x] Add navy/gold compact report styles, bidirectional axes, cohort columns, orbit support view, comparison grid, timelines, heatmaps, and summary grid.
- [x] Run the focused test and confirm it passes.

### Task 4: Regression and build verification

**Files:**
- Modify only if a regression is reproduced in an existing touched path.

**Interfaces:**
- Consumes: completed engine and view changes.
- Produces: verified repository state ready for visual review.

- [x] Run focused intelligence, access, storage, politician detail, compare, and CSS tests.
- [x] Run `npm test` and record exact pass/fail counts.
- [x] Run `node --check lib/intelligence-diagnostics.js` and `node --check src/views/politicians.js`.
- [x] Inspect `git diff --check` and the final changed-file list.
- [x] Report the actual verified state and any pre-existing failures without claiming unverified completion.
