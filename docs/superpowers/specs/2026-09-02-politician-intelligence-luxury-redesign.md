# JCS Politician Intelligence Luxury Redesign

## Goal

Rebuild the public politician detail and private administrator intelligence presentation so the existing information reads as a premium political data and consulting product, while preserving every approved data field and source boundary.

## Non-negotiable constraints

- `DEEP ANALYSIS` and `ANALYSIS TREND` remain completely absent for every role.
- Every meaningful visible text element in the public detail and administrator intelligence is at least 14 CSS pixels on desktop and mobile.
- Existing Redis data, migrated politician profiles, and politician photos are read-only.
- Existing approved Kim Min-seok pilot values and sentences remain the only populated intelligence data.
- Non-pilot politicians receive the same layout with pending marks; no score, judgment, or analysis value is invented.
- The current public analysis categories and administrator report categories remain present.
- Longer vertical scrolling is acceptable when it improves comprehension and perceived value.

## Public detail experience

The public detail becomes a premium editorial intelligence report rather than a repeated white-card dashboard. The profile hero remains, followed by a dark intelligence cover that combines NOW position, signal diagnosis, observation status, and the overall interpretation. Core indicators use large gauge cards. Audience structure uses a wide spectrum. Activity and media use two visual panels with data plots. Attention flow becomes a connected four-stage path ending in a strong JCS diagnosis panel.

The same component structure renders pending profiles. Pending layouts use dashes and explicit connection states only.

## Administrator intelligence experience

The existing outer report gate and inner executive cover become one unified report cover. It contains:

- JCS private report identity
- politician report title and pilot description
- private/pilot classification
- executive intelligence summary title and diagnosis
- evidence mode, report status, snapshot, KPI summary, 30-day pulse, and report chapter index

The report body becomes a sequence of visually distinct consulting chapters. Age and gender use a heatmap-style matrix; support uses gauges and a waterfall; resilience uses a large time-series curve; media uses propagation meters; issues use an impact map; risk and opportunity use a mirrored signal board; evidence uses a source ledger; strategy uses a numbered execution roadmap and conclusion.

## Typography system

- Absolute minimum: 14px
- Supporting labels and metadata: 14px
- Card descriptions: 15px
- Analysis, evidence, and strategy body text: 16px
- Card titles: 17–20px
- Section titles: 21–24px
- Report and chapter titles: 26px or larger

Mobile changes geometry, stacking, and overflow. It never reduces meaningful text below 14px.

## Verification

- Rendering tests assert both new design-system markers and the unified administrator cover.
- Tests assert every required public and private chapter remains present.
- Tests assert forbidden deleted sections stay absent for anonymous, member, and administrator sessions.
- A final CSS override block is physically last in `css/pages.css` and contains a tested 14px floor for both design systems.
- Full test suite and JavaScript syntax checks must pass before packaging.

