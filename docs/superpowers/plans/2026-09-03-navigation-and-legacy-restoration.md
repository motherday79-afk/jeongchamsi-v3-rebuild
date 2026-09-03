# Navigation and Legacy Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the ten approved legacy experiences plus the simplified two-column politician NOW card and ship a verified manual-upload patch archive.

**Architecture:** A History API adapter owns route and restoration state while focused view modules render migrated participation data, integrated search, and the legacy president seed. Existing layout/service boundaries remain intact, with comparison execution encoded in the URL and all responsive density changes scoped to their components.

**Tech Stack:** Browser ES modules, Node built-in test runner, HTML/CSS, existing REST content and politician services.

**Spec:** `docs/superpowers/specs/2026-09-03-navigation-and-legacy-restoration-design.md`

## Global Constraints

- Preserve all current badge and `0.0.26.1` white-screen hotfix changes.
- Do not overwrite migrated content or rerun the migration.
- Use existing data for polls, generation, and national evaluation; use the legacy government seed for president fallback.
- Comparison results require an explicit `비교하기` action and support administrator selection of up to five people.
- The NOW card contains only `전체 NOW` and `분야별 NOW`, displaying `N위` or `집계 전`.
- Deliver one repository-relative ZIP containing fewer than 100 files.

---

### Task 1: Deterministic navigation and immediate Back restoration

**Files:**
- Create: `src/core/navigation.js`
- Create: `tests/navigation.test.js`
- Modify: `src/app.js`
- Modify: `src/layout/interactions.js`

**Interfaces:**
- Produces: `createNavigation({ window, getMarkup, paintMarkup, rebind })` with `start()`, `navigate(route)`, `record()`, and `cacheCurrent()`.
- Consumes: route strings beginning with `/` and the existing root application element.

- [ ] Write tests proving unique entry keys, route/query preservation, pre-push scroll capture, immediate cached popstate painting, scroll restoration, and stale-render rejection.
- [ ] Run `node --test tests/navigation.test.js`; verify the missing module/behavior failures.
- [ ] Implement the navigation adapter and funnel custom layout/search actions plus internal route actions through `navigate()`.
- [ ] Add a render generation guard around the entire asynchronous shell render, cache only current successful renders, and rebind interactions after snapshot restoration.
- [ ] Run `node --test tests/navigation.test.js tests/white-screen-hotfix.test.js`; verify both pass.

### Task 2: Expandable in-flow service navigation

**Files:**
- Modify: `src/layout/home-layout.js`
- Modify: `src/ui/interactions.js`
- Modify: `css/app.css`
- Modify: `tests/layout.test.js`

**Interfaces:**
- Produces: `[data-launcher-toggle]` controlling `[data-launcher-panel]` through `aria-expanded` and `hidden`.
- Consumes: `SERVICE_CATALOG` and existing `jcs:layout-route` events.

- [ ] Add a failing layout contract test asserting that the launcher has no drawer trigger, includes the full service grid, and exposes the correct accessible state.
- [ ] Run `node --test tests/layout.test.js`; verify the launcher contract fails.
- [ ] Render the catalog in a hidden in-flow panel and implement toggle/Escape/outside behavior without opening the drawer.
- [ ] Add responsive expansion styles and rerun `node --test tests/layout.test.js`.

### Task 3: Restore migrated participation pages

**Files:**
- Create: `src/core/national-evaluation-model.js`
- Create: `src/views/participation-pages.js`
- Create: `tests/participation-pages.test.js`
- Modify: `src/app.js`
- Modify: `css/pages.css`

**Interfaces:**
- Produces: `renderPollBoard(context)`, `renderGenerationPresident(context)`, and `renderNationalEvaluation(context)` returning HTML.
- Consumes: `content.list/read/vote`, `politicians.get/search`, session state, and query parameters.

- [ ] Add fixtures and failing tests for all-poll rendering with explicit confirmation, age tabs and TOP 15 name resolution, and two national-evaluation slots with names/results/history.
- [ ] Run `node --test tests/participation-pages.test.js`; verify failures.
- [ ] Port the legacy national-evaluation normalization rules into the focused model.
- [ ] Implement the three renderers and route actions without altering stored content.
- [ ] Add compact responsive styles and rerun the participation tests.

### Task 4: Restore president, integrated search, and support copy

**Files:**
- Create: `src/data/government-seed.js`
- Create: `src/views/president.js`
- Create: `src/views/search-page.js`
- Create: `tests/legacy-pages.test.js`
- Modify: `src/views/stage1.js`
- Modify: `src/app.js`
- Modify: `css/pages.css`

**Interfaces:**
- Produces: `renderPresidentPage()`, `renderSearchPage({ query, ...services })`, and exact support-page HTML.
- Consumes: legacy seed, politician search, migrated content domains, and URL `q`.

- [ ] Add failing tests for president sections, grouped query results, URL-preserved search, and every exact support-copy paragraph.
- [ ] Run `node --test tests/legacy-pages.test.js`; verify failures.
- [ ] Add the government seed and implement president/search renderers with safe empty-domain fallbacks.
- [ ] Replace the support renderer with the approved copy and add its responsive typography.
- [ ] Connect `/president`, `/search?q=`, and `/about`; rerun the legacy-page tests.

### Task 5: Explicit and compact politician comparison

**Files:**
- Modify: `src/views/politician-compare.js`
- Modify: `src/app.js`
- Modify: `css/pages.css`
- Modify: `tests/compare.test.js`

**Interfaces:**
- Consumes: `/compare?ids=<csv>&run=1`, politician `get/search/getForCompare`, and administrator session state.
- Produces: selection mode with `비교하기`, and executed compact consulting mode.

- [ ] Extend tests to assert that selected profiles never reveal analysis before `run=1`, add/remove clears run state, and three-to-five admin results remain in a summary-first layout.
- [ ] Run `node --test tests/compare.test.js`; verify failures.
- [ ] Split selected-profile loading from deep comparison loading and add the explicit execution route.
- [ ] Replace stacked administrator output with a summary matrix, compact diagnostic cards, and collapsed deep details.
- [ ] Add responsive comparison styles and rerun compare tests.

### Task 6: Politician detail density and two-column NOW card

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`
- Modify: `tests/politicians.test.js`

**Interfaces:**
- Produces: a single `.person-hero-now` square with two rank cells.
- Consumes: optional overall/category rank values; outputs `N위` or `집계 전`.

- [ ] Add failing markup tests for exactly two labels, rank suffixes, empty values, and absence of both removed descriptions; add scoped CSS contract tests.
- [ ] Run `node --test tests/politicians.test.js`; verify failures.
- [ ] Simplify rank markup and add final scoped density/rank-card overrides matching legacy proportions.
- [ ] Rerun politician tests at desktop/mobile contract level.

### Task 7: Version, regression verification, and manual-upload archive

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Create: `JCS_0_0_27_HANDOFF.md`
- Create: `tests/jcs-0-0-27-release.test.js`
- Create artifact: `JCS_0_0_27_NAVIGATION_LEGACY_RESTORATION_PATCH.zip`

**Interfaces:**
- Produces: a deterministic ZIP whose paths apply directly at repository root.
- Consumes: only files changed for this release, including the existing white-screen hotfix changes.

- [ ] Add a release test for version/cache-buster consistency and the required source files.
- [ ] Run syntax checks for every changed JavaScript module and the focused test set.
- [ ] Run `npm test`; accept only the documented pre-existing photo fixture mismatch if it remains the sole failure.
- [ ] Write the Korean handoff with scope, application steps, verification, and rollback guidance.
- [ ] Build the ZIP from an explicit manifest, list its contents, test archive integrity, and confirm it contains fewer than 100 files.
