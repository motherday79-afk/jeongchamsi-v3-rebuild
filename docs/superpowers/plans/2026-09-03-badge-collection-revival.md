# JCS_0_0_26 Badge Collection Revival Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete 56-badge collection with real acquisition rules, premium crest visuals, member collection controls, admin grants, and a four-slot sidebar showcase.

**Architecture:** A shared ESM catalog defines presentation metadata while a focused server rules module computes metrics and permissions. The existing gateway owns authenticated reads and mutations, and the current page renderer consumes normalized badge status without duplicating authorization logic.

**Tech Stack:** Vanilla JavaScript ESM frontend, Node/Vercel gateway, Redis activity storage, Node test runner, CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-badge-collection-revival.md`

## Global Constraints

- Preserve the complete historical 56-badge names and acquisition intent.
- BRONZE and SILVER are automatic; GOLD, PLATINUM, and BLACK require admin approval.
- Admin accounts may use all 56 badges immediately.
- Representative badge is exactly one and showcase badges are at most three with no duplication.
- Existing measurable activity is evaluated retroactively; attendance starts from recorded signals only.
- Version all release markers as `0.0.26` / `JCS_0_0_26`.

---

### Task 1: Catalog and Rule Engine

**Files:**
- Create: `src/data/badge-catalog.js`
- Create: `lib/badge-engine.js`
- Test: `tests/badges.test.js`

**Interfaces:**
- Produces: `BADGE_CATALOG`, `badgeByKey(key)`, `badgeCrestSvg(key, extraClass)`.
- Produces: `VALID_BADGE_KEYS`, `computeBadgeMetrics(userId, activity, domains)`, `evaluateBadgeRules(user, activity, metrics)`.

- [ ] Write failing tests asserting 56 badges, BLACK keys, tier counts, automatic BRONZE/SILVER, approval-only GOLD/PLATINUM/BLACK, and admin full access.
- [ ] Run `node --test tests/badges.test.js` and confirm failure because modules do not exist.
- [ ] Port the historical catalog and implement the B-style crest renderer.
- [ ] Implement metrics and rule evaluation with `eligibleBadges` separated from `earnedBadges`.
- [ ] Run `node --test tests/badges.test.js` and confirm all badge-domain tests pass.

### Task 2: Server API and Mutations

**Files:**
- Modify: `lib/rebuild-store.js`
- Modify: `api/gateway.js`
- Test: `tests/badge-api.test.js`

**Interfaces:**
- Consumes: `evaluateBadgeRules(user, activity, metrics)`.
- Produces: `GET /api/v3/user/badges`, `GET /api/v3/admin/badges`, `PATCH /api/v3/admin/users`.
- Produces actions: `badge-representative-set`, `badge-showcase-toggle`, `badge-visit`.

- [ ] Write failing gateway tests with in-memory Redis commands for authentication, grants, revocation, admin full access, one representative, three showcases, and duplicate rejection.
- [ ] Run `node --test tests/badge-api.test.js` and confirm missing route/action failures.
- [ ] Normalize empty activity and record visit/action signals without discarding existing records.
- [ ] Add authenticated badge status and server-side representative/showcase validation.
- [ ] Add admin badge status and member grant/revoke mutation guarded by `role === 'admin'`.
- [ ] Run `node --test tests/badge-api.test.js` and confirm pass.

### Task 3: Member Collection and Controls

**Files:**
- Modify: `src/core/auth.js`
- Modify: `src/views/stage1.js`
- Modify: `src/app.js`
- Test: `tests/badge-ui.test.js`

**Interfaces:**
- Consumes: user badge status and action endpoints.
- Produces: `/mypage/activity?tab=badges`, representative and showcase buttons.

- [ ] Write failing render-contract tests for the 56-item collection, tier sections, progress states, approval candidate copy, and selection controls.
- [ ] Run `node --test tests/badge-ui.test.js` and confirm failure.
- [ ] Add auth-service methods `badgeStatus()`, `setRepresentativeBadge(key)`, `toggleShowcaseBadge(key)`, and `updateMemberBadges(id, keys)`.
- [ ] Route `/mypage/activity` independently from the profile overview and render full tiered collection.
- [ ] Wire selection buttons to server actions and rerender after success.
- [ ] Run `node --test tests/badge-ui.test.js` and confirm pass.

### Task 4: Sidebar Four-Slot Showcase

**Files:**
- Modify: `src/layout/home-layout.js`
- Modify: `src/app.js`
- Test: `tests/badge-sidebar.test.js`

**Interfaces:**
- Consumes: normalized `home.badgeStatus` containing catalog, representative, and showcase entries.
- Produces: one representative slot plus exactly three showcase slots on desktop and mobile.

- [ ] Write failing tests asserting four slots, one representative marker, three showcase markers, no duplicate key, and empty placeholders.
- [ ] Run `node --test tests/badge-sidebar.test.js` and confirm failure.
- [ ] Load badge status with the home data only for authenticated sessions.
- [ ] Render the shared four-slot block in desktop and mobile participation cards.
- [ ] Run `node --test tests/badge-sidebar.test.js` and confirm pass.

### Task 5: Admin Member Badge Management

**Files:**
- Modify: `src/views/stage1.js`
- Modify: `src/app.js`
- Test: `tests/badge-admin-ui.test.js`

**Interfaces:**
- Consumes: enriched admin members and 56-item catalog.
- Produces: per-member tiered checkboxes and explicit save action.

- [ ] Write failing tests for all-member badge controls, earned/eligible/granted distinctions, BLACK controls, and save state.
- [ ] Run `node --test tests/badge-admin-ui.test.js` and confirm failure.
- [ ] Enrich admin user results with activity and evaluated status.
- [ ] Render member accordion controls grouped by tier and add save handling.
- [ ] Run `node --test tests/badge-admin-ui.test.js` and confirm pass.

### Task 6: Premium Crest Styling and Release

**Files:**
- Modify: `styles.css`
- Modify: `package.json`
- Modify: `api/gateway.js`
- Modify: frontend cache-query markers in touched ESM imports
- Test: `tests/badge-design.test.js`

**Interfaces:**
- Consumes: `.badge-crest-{tier}` markup.
- Produces: responsive, reduced-motion-safe B-style crest visuals.

- [ ] Write failing CSS/version contract tests for all five tier selectors, BLACK gold detailing, four-slot layout, mobile reflow, reduced motion, and version `0.0.26`.
- [ ] Run `node --test tests/badge-design.test.js` and confirm failure.
- [ ] Implement the crest materials, selected/locked states, collection grids, sidebar slots, and admin controls.
- [ ] Update package, health response, and cache markers to `0.0.26` / `JCS_0_0_26`.
- [ ] Run `npm test` and JavaScript syntax checks.
- [ ] Build `JCS_0_0_26.zip` with only changed/new paths and create `JCS_0_0_26_HANDOFF.md`.
- [ ] Verify ZIP paths and checksums, commit, push `main`, then verify Vercel health returns `JCS_0_0_26`.
