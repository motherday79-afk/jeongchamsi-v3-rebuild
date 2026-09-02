# Politician Intelligence Luxury Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild public and administrator politician intelligence as a premium visual report with a hard 14px typography floor.

**Architecture:** Keep the existing ES-module renderer and approved pilot data contract. Refactor only the HTML composition in `src/views/politicians.js`, append an authoritative final design layer to `css/pages.css`, and protect the contract with Node rendering and CSS tests.

**Tech Stack:** Browser ES modules, HTML template strings, CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-02-politician-intelligence-luxury-redesign.md`

## Global Constraints

- `DEEP ANALYSIS` and `ANALYSIS TREND` remain absent.
- Meaningful public-detail and administrator-intelligence text is never below 14px.
- Redis, migrated profiles, and photo assets are not modified.
- Only approved Kim Min-seok pilot data may populate intelligence values.
- Every existing public and administrator report category remains.
- Package the result as `JCS_0_0_12.zip` without politician image assets.

---

### Task 1: Lock the redesign contract

**Files:**
- Modify: `tests/politicians.test.js`

**Interfaces:**
- Consumes: `renderPoliticianDetail(id, service, session)`
- Produces: rendering and CSS contract assertions for both design systems

- [ ] Add tests for public design marker, premium cover, gauge grid, visual activity panels, and connected attention flow.
- [ ] Add tests for the unified private cover containing both report identity and executive summary.
- [ ] Add tests for the final CSS marker and 14px floor after all legacy rules.
- [ ] Run `node --test tests/politicians.test.js` and confirm the new assertions fail for missing redesign markers.

### Task 2: Rebuild public politician intelligence

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`

**Interfaces:**
- Consumes: existing pilot fields `signal`, `rank`, `core`, `audience`, `activity`, `media`, `transition`, and `diagnosis`
- Produces: `data-design-system="jcs-public-intelligence-v2"` report HTML

- [ ] Replace the public signal with a premium command cover.
- [ ] Recompose core, audience, activity/media, and attention flow with distinct visual components.
- [ ] Mirror the same geometry for non-pilot pending layouts without populated values.
- [ ] Append public visual CSS and a 14px text floor at the physical end of `css/pages.css`.
- [ ] Run the focused tests and require the public redesign assertions to pass.

### Task 3: Rebuild private administrator intelligence

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`

**Interfaces:**
- Consumes: existing admin pilot source, cohort, support, resilience, media, issue, risk, evidence, strategy, and history fields
- Produces: `data-design-system="jcs-private-intelligence-v2"` unified cover and consulting chapters

- [ ] Merge the outer report title and inner executive summary into one `admin-intelligence-unified-cover`.
- [ ] Preserve every existing report chapter and value while assigning chapter-specific visual classes.
- [ ] Recompose evidence as a ledger and strategy as an execution roadmap.
- [ ] Append private report CSS and the administrator 14px floor at the physical end of `css/pages.css`.
- [ ] Run focused tests and require private cover, chapter, and typography assertions to pass.

### Task 4: Version, verify, and package

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `api/gateway.js`

**Interfaces:**
- Produces: version `0.0.12` and `JCS_0_0_12.zip`

- [ ] Bump cache, package, and health markers to `0.0.12`.
- [ ] Run JavaScript syntax checks.
- [ ] Run `node --test tests/*.test.js` and require zero failures.
- [ ] Verify forbidden sections are absent and all required public/private sections remain.
- [ ] Package only changed core files, excluding politician images, and verify ZIP integrity and file count below 100.
