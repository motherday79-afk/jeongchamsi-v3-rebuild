# JCS SPREAD Implementation Plan

> For agentic workers: use executing-plans inline; the user has already authorized implementation.

**Goal:** Politician search opens a profile summary and an interactive publisher analysis directory for every stored politician.
**Architecture:** A pure media index consumes published compact inputs, deduplicates articles across people and computes rolling windows. A cached public API serves the profile target and publisher drilldown without generating private diagnoses. Search renders the existing shell with a dedicated scoped stylesheet.
**Tech Stack:** Existing JavaScript ES modules, Node tests, compressed Redis snapshots, CSS.
**Spec:** User requirements in this conversation, transcribed below.

## Global Constraints
- Search labels: JCS SPREAD / 정참 시선. Tabs: 최신순 (7 days) / 누적순 (30 days).
- Profile detail link first; publisher name directory below; selection shows coverage subjects, earliest collected reporting and follow-ups.
- All politicians and matching parties supported; article shared by multiple people counts once in party totals.
- No invented counts or claims of global scoops or favorable political intent.
- Existing historical title corpus is only 14 days; mark partial legacy evidence. Extend future compact corpus to 30 days, without a second copy of titles.
- Preserve publisher and politician selection across period changes; keyboard and mobile layout supported.
- Keep private diagnoses out of public index. Read published pointers and valid person overrides only.

## Task 1: Analysis and retention
Files: lib/media-spread.js, lib/intelligence-storage.js, tests/media-spread.test.js.
- [x] Test rolling 7/30 bounds, alias normalization, duplicate articles and party aggregation.
- [x] Test earliest timestamp ties, similar-issue grouping, no grouping by politician alone, later coverage and unknown timestamp exclusion.
- [x] Implement buildMediaIndex(drafts, profiles), analyzeMediaIndex(index, {query, personId, publisher, period, now}).
- [x] Extend the existing title corpus to 30 days with a version marker and coverage metadata. Test retention beyond 14 days.
Commands: node --test tests/media-spread.test.js.

## Task 2: Published API and caching
Files: lib/media-spread-service.js, api/gateway.js, lib/intelligence-service.js, lib/intelligence-repository.js, lib/intelligence-keys.js, src/core/politicians.js.
- [x] Load compact index by public snapshot; coalesce concurrent cold requests. Batch old snapshot reads in bounded groups, never hydrate reports.
- [x] Precompute compressed index during publication. Invalidate after person publication; apply only overrides tied to the current public snapshot.
- [x] Add GET politicians?media=1 and client mediaSpread method.
- [x] Test missing snapshots, warm cache reuse, unpublished exclusion and person overrides with an in-memory command adapter.
Commands: node --test tests/media-spread-service.test.js.

## Task 3: Search and delivery
Files: src/views/search-page.js, src/views/media-spread-view.js, src/app.js, css/jcs-spread.css, index.html.
- [x] Render profile selection, detail CTA, period links, publisher grid, coverage bars, early/follow-up analysis and evidence.
- [x] For non-politician queries keep actual matching board results, hide unrelated empty modules.
- [x] Replace the entire search component on same-query navigation; retain focus and scroll position for filters.
- [x] Test routing, escaping, cached requests, labels, empty/error states, and all-politician reuse.
- [x] Run targeted existing storage, publication, ranking tests and syntax checks; package 31.147 PATCH/FULL, verify overlay, save deliverables.
Commands: node --test tests/media-spread*.test.js; node --check on changed JavaScript files.

## Verification record

57 targeted tests passed: 16 new search/media checks and 41 existing storage/publication/media/ranking checks. Synthetic benchmark: 543 profiles, 32,580 article records; index build 1,135 ms, query aggregation 27 ms, compressed index 398,045 bytes. These are local fixture CPU results, not measured production response times. Live operational DB and PC/mobile browser rendering were unavailable.
