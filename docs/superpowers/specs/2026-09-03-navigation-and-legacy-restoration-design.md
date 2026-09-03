# Navigation and Legacy Restoration Design

## Goal

Restore the previously completed participation, search, comparison, president, and brand experiences without disturbing the badge or white-screen hotfix work already present, and deliver the result as a small manual-upload patch archive.

## Product requirements

1. Browser Back/Forward restores the exact preceding route, selected state, and scroll position immediately. A stale asynchronous render must never overwrite the active route.
2. The national evaluation page uses migrated `nationalEvaluation` records, resolves politician IDs to names/photos, supports the two legacy slots, displays results/history, and keeps voting behind authentication and the active window.
3. The generation-president page uses migrated `generation` records, restores age tabs, TOP 15, politician name/photo resolution, search, and authenticated voting.
4. `EXPLORE JEONGCHAMSI` / `전체 서비스` expands an in-page service grid below the existing navigation. It never opens the left hamburger drawer.
5. `귀담아 들어야 합니다` restores the complete migrated poll board. A choice is selected first and submitted with an explicit confirmation action.
6. Integrated search retains the entered query in the URL and presents grouped politician, president, column, IT'S ME, community, poll, generation, and national-evaluation results from existing data.
7. Politician comparison restores search-and-select cards with portrait, name, party, district, and office.
8. Comparison analysis is hidden until `비교하기` is pressed. Selecting/removing a politician clears executed state. Administrators may select up to five; executed admin results prioritize a compact consulting summary and put deeper data in collapsed details.
9. Politician-detail type and box density follow the compact legacy proportions, including labels smaller than 14px where required. The adjustment is scoped to politician-detail pages.
10. The president page is completed from the legacy government seed and exposes profile, career, election, vision, policy, pledge, national-task, leadership, and cabinet information.
11. Every politician detail shows one clean square NOW card with exactly two columns: `전체 NOW` and `분야별 NOW`. Values are `N위` or `집계 전`. `공개 스냅샷 운영 순위` and `국회의원 NOW 독립 순위` are removed everywhere.
12. The support/about page uses the user-provided copy exactly. `세계적으로 유명한 배우들도 끊임없이 훈련합니다.` is larger and bold; the remaining paragraphs have deliberate, readable line breaks; `대한민국 No.1 정치 네비게이션 정.참.시` closes with emphasis.

## Architecture

- Add a small History API navigation module. Every internal navigation funnels through it. Each history entry has a stable key, route, and scroll coordinates; successful page markup is cached by key for immediate popstate restoration.
- Keep page renderers focused: participation pages, president, and search live in separate view modules and consume existing services rather than duplicating storage logic.
- Use the legacy repository only as a behavioral/data reference. Current migrated domains remain authoritative for polls, generation, and national evaluation; the president seed is copied as a read-only fallback.
- All new DOM behavior remains delegated through the existing layout interaction setup so restored snapshots are interactive after Back/Forward.

## State and fallback rules

- Route state is URL-addressable (`q`, `age`, selected compare IDs, and `run=1`).
- Before a route push, the current history entry records scroll and the rendered shell snapshot.
- Popstate paints a cached snapshot before any network request and restores its scroll position. A background refresh may update the same route only if its render token is still current.
- A hard-loaded route without a snapshot follows the normal renderer and shows the existing loading/error shell.
- Missing or unavailable domain data produces an empty-state message, never a white screen.

## Visual rules

- The expanded service grid is part of document flow, keyboard reachable, and controlled with `aria-expanded`/`hidden`.
- Comparison results remain readable with five people by using a horizontal summary matrix and one compact diagnostic card per person; raw/deep metrics stay collapsed.
- The NOW card uses `aspect-ratio: 1 / 1`, equal columns, restrained typography, and the same structure at mobile and desktop widths.
- Politician detail density changes do not alter general site typography.

## Verification and release

- Add focused Node tests for navigation, restored views, launcher behavior, compare gating, NOW markup, and CSS contracts.
- Run focused tests, syntax checks, and the full suite. The known unrelated photo fixture mismatch (`expected 515`, current dataset `593`) is documented rather than modified.
- Package only changed/new release files, tests, and handoff notes in one ZIP with repository-relative paths; no `node_modules`, Git metadata, or unrelated files.
