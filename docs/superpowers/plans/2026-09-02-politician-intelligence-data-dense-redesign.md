# JCS Politician Intelligence Data-Dense Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stretched and repetitive politician intelligence UI with semantic public and private visual reports plus data-ready derived-intelligence chapters.

**Architecture:** Keep the existing ES-module data and rendering boundary. Add focused SVG/HTML render helpers in `src/views/politicians.js`, extend only the approved Kim pilot contract where values are directly derived from approved facts, and append one authoritative v3 CSS layer after all legacy rules. No chart library or external font is added.

**Tech Stack:** Browser ES modules, HTML template strings, inline SVG, CSS Grid/Flexbox, native `<details>`, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-02-politician-intelligence-data-dense-redesign.md`

## Global Constraints

- The private report summary is closed by default and contains only report identity, description, status, date, and open control.
- `허용 원자료와 JCS 해석을 분리한 단일 인물 파일럿 리포트 (JCS 해석)` appears exactly once in the private report.
- No Naver search volume or search-derived score is invented.
- Every meaningful visible text element is at least 14px on desktop and mobile.
- Existing Redis, profiles, photos, login, content, and approved pilot facts remain unchanged.
- `DEEP ANALYSIS` and `ANALYSIS TREND` remain absent.
- This extracted ZIP workspace has no Git metadata, so each task ends with a test checkpoint instead of a commit.

---

### Task 1: Lock rendering and typography contracts

**Files:**
- Modify: `tests/politicians.test.js`

**Interfaces:**
- Consumes: `renderPoliticianDetail(id, service, session)`
- Produces: contract assertions for semantic visuals, collapsed private gate, new private chapters, search pending state, and style tokens

- [ ] Add a public test requiring `person-core-radar`, `person-core-bullet-ledger`, `person-activity-bars`, and `person-attention-funnel`.
- [ ] Add a private gate test that extracts the `<summary>` substring and asserts it excludes `EXECUTIVE INTELLIGENCE SUMMARY` while the complete HTML includes it.
- [ ] Assert the exact private subtitle and exactly one `JCS 해석` occurrence.
- [ ] Add a private visual test requiring heatmap, support bars, quality radar, resilience chart, propagation flow, issue quadrant, gap dumbbell, source ledger, and strategy roadmap markers.
- [ ] Add a derived-chapter test requiring all seven new chapter titles and `SEARCH DATA CONNECTION REQUIRED`, while forbidding fabricated `PC 검색량` numbers.
- [ ] Add CSS assertions for the v3 final marker, 14px floor, approved text tokens, and absence of `font-size` declarations below 14px inside the v3 layer.
- [ ] Run `node --test tests/politicians.test.js`; confirm failures identify missing v3 markup and style markers.

### Task 2: Recompose public intelligence

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`

**Interfaces:**
- Consumes: `signal`, `core`, `audience`, `activity`, `media`, `transition`, `diagnosis`
- Produces: `data-design-system="jcs-public-intelligence-v3"` with semantic inline SVG and accessible labels

- [ ] Add pure render helpers for a polygon radar, bullet row, grouped score bars, and four-stage funnel.
- [ ] Render the pilot core overview as one radar plus exact six-row ledger.
- [ ] Render pending core values as an empty radar frame and dash ledger without invented scores.
- [ ] Replace activity/media line plots and axis cards with two grouped horizontal score panels.
- [ ] Replace attention donut cards with a connected stage flow and diagnosis.
- [ ] Append the public v3 CSS using content-sized blocks and the approved palette.
- [ ] Run the focused test file; require every public assertion to pass.

### Task 3: Correct private disclosure and existing visuals

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `css/pages.css`

**Interfaces:**
- Consumes: approved pilot cohorts, support, resilience, mediaScores, issues, risks, opportunities, competitors, sources, strategies
- Produces: compact `admin-intelligence-report-gate-v3` summary and expanded `admin-intelligence-executive-v3` plus semantic private chapters

- [ ] Move executive ribbon, evidence card, KPI strip, pulse, and index outside `<summary>` into the expanded body.
- [ ] Render the approved subtitle once in the summary.
- [ ] Rebuild age/gender rows as direct three-column grid children and add numerical gaps.
- [ ] Rebuild support as comparison bars, waterfall geometry, and a four-axis quality radar.
- [ ] Rebuild resilience, propagation, issue impact, risk/opportunity, attention gap, competitor, evidence, strategy, and history sections with their approved visual markers.
- [ ] Render equivalent pending structures for non-pilot politicians without populated values.
- [ ] Append private v3 CSS with high-contrast colors and no arbitrary content min-heights.
- [ ] Run the focused test file; require gate, chapter, pending, and single-label assertions to pass.

### Task 4: Add data-ready derived intelligence chapters

**Files:**
- Modify: `src/views/politicians.js`
- Modify: `src/data/kim-minseok-pilot.js` only if a display sentence can be derived directly from an existing approved field
- Modify: `css/pages.css`

**Interfaces:**
- Consumes: existing `raw`, `cohorts`, `support`, `mediaScores`, `issues`, `competitors`, `strategies`, and `sources`
- Produces: seven private chapter renderers; search-dependent renderers accept `searchAds.status` and never synthesize values

- [ ] Render Digital Demand and Search Intent as a high-quality connection-ready module when `searchAds.status !== 'READY'`.
- [ ] Render News Narrative using approved news counts, issue labels, and source diversity without sentiment fabrication.
- [ ] Render Public Opinion Conversion from approved leadership, Gallup context, support, and cohort values.
- [ ] Render Constituency Opportunity from approved election facts and explicitly mark unavailable detailed constituency population data.
- [ ] Render JCS Cross Intelligence from existing approved cross-source values and label the calculation inputs in the evidence ledger, without repeated `JCS 해석` badges.
- [ ] Render the 30-day action roadmap from existing approved strategy sentences and measurable checkpoints.
- [ ] Add responsive chapter CSS and `content-visibility:auto` only for expanded long-form chapters.
- [ ] Run focused and full test suites; require zero failures.

### Task 5: Version, verify, and package

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `api/gateway.js`
- Create: `../JCS_0_0_13.zip`

**Interfaces:**
- Produces: version `0.0.13` and upload-ready full package

- [ ] Update package and cache/health markers from `0.0.12` to `0.0.13`.
- [ ] Run `node --check` for every changed JavaScript file.
- [ ] Run `node --test tests/*.test.js` and require zero failures.
- [ ] Start the local server and inspect Kim Min-seok public and administrator renderings at desktop width.
- [ ] Inspect a narrow viewport and confirm 14px minimum, readable matrices, and compact closed summary.
- [ ] Verify the production page remains free of `DEEP ANALYSIS` and `ANALYSIS TREND` strings.
- [ ] Create `JCS_0_0_13.zip`, exclude `node_modules`, temporary files, and prior ZIPs, then run `unzip -t` successfully.
