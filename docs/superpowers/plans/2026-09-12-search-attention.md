# JCS SPREAD monthly attention comparison Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent view task; the primary worker owns data integration and packaging. User approved implementation and ZIP delivery in the current conversation.

**Goal:** Show the searched politician's news/search position before the existing publisher analysis.

**Architecture:** Extract a small public monthly metric record from each already published input while building the cached media index. Analyze these records without collecting or loading individual detail reports on each search. Render a scoped SVG comparison and related-person links immediately below the searched profile.

**Tech Stack:** Existing ES modules, Node test runner, HTML/CSS/SVG, existing Redis public snapshot cache.

**Spec:** Approved conversation: profile → one-line position → news/search counts and ranks → faint comparison dots plus purple/gold selected person → related people and compare links → existing publisher analysis. Monthly comparison remains independent of publisher latest 7-day/cumulative 30-day tabs.

## Global Constraints

- Keep the existing workspace and ZIP workflow; no GitHub checkout, remote mutation, deployment, or forced full recollection.
- Purple/gold styling; no invented metrics, composite score, fabricated politician, or interpretation as support.
- Compare people in the same registered type with both numeric sources available. Tie-aware ranks; insufficient data never becomes zero or a forced quadrant.
- Search = Naver monthly PC + mobile keyword counts; news = collected 30-day article count as of collection. Label their actual bases; they are not identical day-by-day series.
- Collection times for the two sources must be within 48 hours. Cohort observations must be within 48 hours of the target and no more than 30 days old; disclose date range. Minimum four comparable people to classify; smaller sets show counts without invented positioning.
- Preserve collector exact/range precision and timestamps during compaction; legacy zero components are ambiguous and excluded from classification. Do not alter existing operational ranking calculation in this feature.
- Existing publisher attribution, public/private boundaries and period behavior must pass regression tests.
- Responsive layout at 320/375/768/1280 px; touch targets, keyboard access, no horizontal page overflow. No browser QA claim unless a browser actually ran.

## Task 1: Metrics and cache integration (primary worker)

Create `lib/search-attention.js`; modify `lib/media-spread.js`, `lib/intelligence-storage.js`, and if needed collector precision metadata. Add `tests/search-attention.test.js` and service tests.

Interfaces:
```js
buildAttentionRecords(drafts,profiles) // array of {id,newsCount,searchCount,pc,mobile,newsAt,searchAt,referenceAt,partial}
analyzeSearchAttention(records,people,personId,{now}) // null or Attention below
```

- [x] Write failing tests with literal fixtures: all four quadrants, equal counts, null and bounded search values, 30-day news bucket instead of representative ten articles, stale and differently dated records, other-type exclusion, meaningful peer selection, retained search precision, warm cache/public scope.
- [x] Run `node --test tests/search-attention.test.js` and record expected missing-feature failures.
- [x] Implement extraction, comparison, and persistence metadata; update media-index version so 31.148 caches rebuild from existing published records.
- [x] Run covering tests and existing media/storage/source regressions.

Attention public view interface (only `target` contains selected metrics; points and peer people use the same shape):
```js
{
 status:'ready'|'insufficient',
 target:{id,name,party,type,newsCount,searchCount,pc,mobile,newsAt,searchAt,referenceAt,newsRank,searchRank,newsTied,searchTied,x,y},
 category:'both'|'search'|'news'|'quiet'|'balanced',
 headline:'서버에서 생성한 한국어 한 문장',
 cohort:{label:'국회의원',size:123,from:'ISO',to:'ISO',partial:false},
 points:[{id,name,newsCount,searchCount,newsRank,searchRank,x:0,y:100}],
 peers:[{kind:'more-search'|'more-news'|'similar',label:'보도량은 비슷한데 검색이 많은',person:{id,name,party,newsCount,searchCount,newsRank,searchRank}}]
}
```

Position coordinates use rank percentiles 0–100 (tie midpoint), not raw counts, to avoid a single extreme politician collapsing the plot. Explain axes explicitly as relative positions and retain raw counts in the metrics. Category threshold is the comparison-group midpoint, not an invented score. An axis exactly at 50 is a boundary and does not support saying that measure stands out or is below the middle; use a neutral balanced category and say explicitly which measure is at the middle and whether the other is higher or lower. Only values strictly above 50 support the corresponding above-middle claim. Peer similarity requires 25% count proximity (minimum tolerance 2 news / 10 searches); greater means strictly greater. Omit unsupported suggestions.

## Task 2: View (independent UI worker)

Create `src/views/search-attention-view.js`, `css/jcs-attention.css`, `tests/search-attention-view.test.js`. Export `renderSearchAttention(attention)` returning HTML or empty string for null. No imports from media-spread-view (avoid cycles); safe local URL construction and escaping.

- [x] Write view behavior tests for null, ready, insufficient, safe URLs/escaped names, rankings/ties, and peers' search/compare destinations; run them before implementation.
- [x] Implement selected-person-first editorial layout with metrics left / rank-position SVG right on PC; stack on mobile. Chart shows all cohort points faintly, selected point purple with gold rim and name. Accessible text and usable related links; do not rely on hover alone.
- [x] Display compact monthly label and data-date basis. Explanation of counts/position in a collapsible details element; no repeated badges or fake demo data in production.
- [x] Related cards link to `/search?q=NAME&person=ID`, and `/compare?ids=ID1%2CID2&run=1`.
- [x] Run view tests and syntax check. Report actual browser availability honestly.

## Task 3: Integration, review and package (primary worker)

- [x] Import view into media-spread-view and insert after target profile, before publisher controls; include CSS from index.
- [x] Verify monthly result does not change when publisher or 7/30 tab changes, and party search never sums politician-name searches as party volume.
- [x] Review implementation against approved content, data provenance and cache behavior; resolve important findings and rerun only affected coverage.
- [x] Build 31.149 PATCH and FULL from 31.148 baseline. Check relative imports, JS syntax, archive integrity and exact patch overlay; include tests/readme/plan.
- [x] Save ZIP deliverables and return links with test results and deployment limitation.

## Completion evidence

104 targeted tests passed. Final review findings on missing-news zero and midpoint wording addressed and re-reviewed. 19-file PATCH and 148-file FULL archive verified against 31.148. Source SVG inspected at desktop/mobile dimensions; actual browser and live DB validation unavailable. Delivery is through local ZIP files, not a remote deployment.
