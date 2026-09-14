# Home refinements and five campaign examples — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development, with isolated file ownership and a final independent review. Preserve this current directory; do not create a replacement checkout.

**Goal:** Apply approved manual cage title layout, white support banner, aligned compare effects and five fictional campaign examples.
**Architecture:** Extend existing cage community metadata with an optional title-bound display configuration; anchor compare visuals to avatar bounds; use five bundled example records with persisted admin overrides and explicit sample markers.
**Tech Stack:** Vanilla ES modules, SVG/CSS, existing Redis CAS service, Node tests.
**Spec:** User approval in this conversation: manual break point + first/second/equal emphasis, unchanged title words and stage bounds; white 50:50 support banner with purple/gold icons/type and refined arrows; avatar/crack/select same center; one featured plus four fictional campaigns.

## Global Constraints
- Baseline ZIP JCS_0_0_31_157, target 158; no git reset/checkout, no deployment.
- Preserve badges and original data. Current source /workspace/scratch/b627f5328562/qa161/source-155.
- No main campaign banner integration. Fictional sample campaign photographs may be reused from approved prototypes, never existing politician portraits.
- Samples clearly labeled, no real accounts/QR/video claims. Keep sample identity metadata outside client content input so it cannot be forged/removed on edits. Example numbers independent of official series.
- No browser access: previous local preview explicitly blocked. Use source/geometry/event tests; disclose browser limit.

### Task 1: White support banner and compare alignment
Files: src/layout/home-layout.js (supportBridge/compare only), src/ui/compare-motion.js, css/home-refinements-158.css, tests/home-refinements.test.js, tests/home-compare-motion.test.js.
Interfaces: preserve compare DOM selection/animation contracts and existing support links /about and /points?view=support. Parent adds stylesheet/import versions later. Derive crack and effect x/y and selection center from each actual avatar rect; refresh on resize/profile selection. Avoid observing animation frames as layout changes. Prefer avatar anchor within stable entrant wrapper so CSS transforms do not introduce drift.
- [ ] Inspect current geometry and reproduce avatar vs slot center mismatch.
- [ ] Test avatar-centered geometry and independent per-side anchors (PC, narrow layout).
- [ ] Build white 80px 50:50 support bridge using native SVG icons and existing material gradients; dark-purple text + limited gold accents. Preserve whole-half hit areas.
- [ ] Align cracks, shock/dust/debris and selection controls to avatar center; keep captions/text/VS and motion timing unchanged.
- [ ] Run focused tests and report scope + quality.

### Task 2: Cage title control
Files: new src/core/cage-title-layout.js, src/ui/cage-title-editor.js; existing src/ui/home-cage-banner.js, src/views/community-ui.js, lib/community-service.js, src/core/auth.js, src/app.js, api/gateway.js, tests.
Interfaces: banner receives titleLayout={title,breakAt,emphasis:'first'|'second'|'equal'} bound to normalized title; save body optional titleLayouts by cage id through featureCage. Validate title match and split by Unicode codepoint index; never rewrite words. Existing approved title art remains default unless manual layout chosen. Legacy no-config titles retain fallback; explicit layouts never auto-resplit/truncate. Two-line readable width constraint reported in editor/server before save.
- [ ] Read existing featureCage CAS and insert optional per-cage layout under community metadata without losing concurrent posts/comments.
- [ ] Test exact line preservation, stale-title rejection, width bounds and non-admin denial.
- [ ] Add admin break controls + emphasis select + actual SVG preview inside current cage detail settings, retain selection default and values across changing featured cage.
- [ ] Wire save; clear navigation/home data caches so fresh banner appears. Improve dynamic title ink/shadow/roughness without replacing approved original art.
- [ ] Run focused tests and static source/geometry check.

### Task 3: Five fictional campaign examples
Files: src/data/campaign-examples.js, assets/campaigns/example portraits, campaign-model/service/pages/editor/CSS and tests.
Interfaces: deterministic example IDs, isExample:true and exampleNumber:1..5 on records. Base examples supply full editable draft/published story, photo crop metadata. Redis records override each example by ID; hide remains durable; absent example records come from bundled data. Saving an example uses CAS against actual absent/raw Redis value while mutating the virtual previous record; do not allocate official number for examples. Public projections retain isExample/exampleNumber. No sample enters politician directory or actual support flow. Official create remains unchanged.
- [ ] Recover approved prototype photo bytes unchanged and inspect them; use existing crop positions via CSS/object-position, no regeneration.
- [ ] Write complete distinct content for housing, transport, care, traditional market and local jobs with three policies each; all people/party/region explicitly fictional and personId empty.
- [ ] Test default 1+4, complete detail, admin editable/hide overrides, no official numbering, no support, user input cannot fake sample metadata.
- [ ] Add compact example notice on list/detail/editor and independent EXAMPLE labels, no layout redesign. Example dates display sample period, public examples remain visible until hidden.
- [ ] Run focused tests and review.

### Task 4: Integration, review and delivery
- [ ] Bump dependency cache versions and release/index to158; include CSS.
- [ ] Independent final review, address concrete important issues.
- [ ] npm test, syntax/import checks, protected badge/data hash comparison, no unrequested campaign banner integration.
- [ ] Package157→158 patch/full with byte equality; README operating instructions, verification limits; save both ZIPs.

## Accepted steering during execution
CAMPAIGN now includes politics, arts/culture and business/startup. Add category values politics/culture/business; default existing records to politics. Global catalog filters all categories, category-specific story/policy/organization labels, politics-only autocomplete. Keep existingpolitical principle on politics detail; overall/culture/business emphasize opportunities for people and projects. Five fictional examples: politics2, culture2, business1. No payment expansion.
