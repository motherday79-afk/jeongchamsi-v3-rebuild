# JCS Politician Intelligence Data-Dense Redesign

## Goal

Rebuild Kim Min-seok's public detail and private administrator intelligence so vertical length is earned by distinct evidence, analysis, and consulting decisions rather than enlarged cards or repeated scores.

## Fixed product rules

- Public detail keeps the approved summary categories but does not expose administrator-only formulas, evidence synthesis, or action strategy.
- Private intelligence is closed by default. Its `summary` contains only the JCS private seal, report title, pilot description, status, date, and open control.
- The phrase `허용 원자료와 JCS 해석을 분리한 단일 인물 파일럿 리포트 (JCS 해석)` appears once in the private report title and nowhere else.
- Explanatory conclusions remain beside or below their relevant visual, but are not repeatedly labeled `JCS 해석`.
- `DEEP ANALYSIS` and `ANALYSIS TREND` remain absent for every role.
- Existing Redis data, migrated profiles, photos, login behavior, content, and allowed Kim Min-seok pilot values are not modified.
- No search volume or derived value is invented before Naver Search Ads data is connected.
- Every meaningful label, legend, axis, note, button, and body string is at least 14 CSS pixels on desktop and mobile.
- Graphs are semantic: categorical scores never use time-series lines, and a second visual may repeat a value only when it adds exact reading or explanation without another large card.

## Public report

1. Keep the profile hero and compact dark `PUBLIC BRIEF` cover.
2. Replace six large core score cards with one six-axis radar and an exact six-row bullet ledger.
3. Keep audience position as a spectrum and render its four supporting values as compact lollipop rows.
4. Replace activity/media line plots and six large cards with two grouped horizontal bar panels and one gap conclusion.
5. Replace four attention donuts with a connected four-stage conversion flow whose segment widths and labels show the funnel.
6. Preserve recent news, profile and record, election history, career, education, and related content below the public report.

## Private report

The closed summary is a compact report gate. On expansion, a separate executive panel shows the executive conclusion, evidence mode, KPIs, 30-day pulse, and chapter index.

Existing chapters use distinct visuals:

- Age × Gender: true three-column heatmap with explicit male/female cells and cohort gap.
- Core Support: four-axis comparison bars.
- Support Waterfall: positive/negative waterfall bars with cumulative values.
- Support Quality: four-axis radar.
- Political Resilience: event-aware line/area curve and resilience components.
- Media Propagation: staged propagation flow plus channel meters.
- Issue Impact: impact × persistence bubble quadrant.
- Risk & Opportunity: impact/urgency matrices and signal evidence.
- Attention → Support Gap: dumbbell chart.
- Competitor Flow: positioning bars and directional gap.
- Evidence Base: source ledger.
- Strategic Solution: urgency/impact board and 7/14/30-day roadmap.
- History Intelligence: snapshot timeline and compact metric sparklines.

## New private chapters

The renderer provides data-ready chapters for:

1. Digital Demand Intelligence
2. Search Intent Map
3. News Narrative Intelligence
4. Public Opinion Conversion
5. Constituency Opportunity
6. JCS Cross Intelligence
7. 30-Day Consulting Action

Current approved non-search pilot facts populate only calculations that can be derived directly from existing approved fields. Search-dependent visuals expose source readiness without scores or substitute values until the Naver source is connected.

## Typography

Keep the existing local system stack. Use 32–40px report titles, 24–28px chapter titles, 20–22px subsection titles, 17–19px card titles, 16px body, 14–15px support copy, and 14px axes/legends. Use tabular numerals for metrics and never reduce text to fit a narrow layout.

## Color and accessibility

- Light background `#F3F6F5`, card `#FFFFFF`, title `#173133`, body `#30484A`, support text no lighter than `#65777A`, border `#D7E1DE`.
- Private cover background runs from `#081A1A` to `#10342E`; title `#FFFFFF`, body `#E2ECE9`, support `#B8CBC6`, mint `#79DDBB`, gold `#E2C77E`.
- Positive `#168568`, information `#356EC9`, warning `#B36B00`, risk `#B33B4B`, strategic `#7054C8`, neutral `#516B73`.
- Meaning is never communicated by color alone. Each state includes text, value, icon, or direction.

## Responsive behavior

Desktop uses paired visuals only when both remain readable. Tablet stacks complex paired panels. Mobile changes matrices into horizontal overflow or stacked rows without shrinking text below 14px. The private gate remains compact and closed by default at every width.

## Verification

- Rendering tests assert semantic visual markers, the compact summary boundary, the single `JCS 해석` occurrence, private-only new chapters, and pending search behavior.
- CSS tests assert the final design layer is physically last, contains the 14px floor, approved color tokens, and no new sub-14px declarations.
- Full Node tests, JavaScript syntax checks, desktop browser inspection, and narrow viewport inspection pass before packaging.
