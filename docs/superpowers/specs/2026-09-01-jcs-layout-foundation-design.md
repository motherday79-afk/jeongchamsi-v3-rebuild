# JCS V3 Clean Layout Foundation Design

## Goal
Rebuild the current Jeongchamsi information architecture on a clean UI foundation while improving visual hierarchy, spacing, cards, typography and responsive behavior. No production API, Redis, refresh engine or persistent storage is included in this phase.

## Scope
- Global shell: header, primary navigation, mobile navigation, footer, page container.
- Home: Intelligence hero, NOW Rank, Live Pulse, ItsMe, participation, compare, community, generation/national evaluation, content.
- Politician detail: profile hero, rank pair, intelligence cards, trend/cohort placeholders, compare CTA.
- Compare: multi-person comparison layout shell and matrix/cards.
- Admin: control-center shell, refresh pipeline visual, dataset/status cards, admin navigation.
- Responsive behavior for desktop/tablet/mobile.
- Static fixture data only, clearly labelled FOUNDATION / DEMO UI.

## Design Direction
Preserve current section order and product identity, but rebuild the visual system with stronger hierarchy. The home hero combines NOW Rank and Live Pulse rather than using a large brand-only hero. Cards use a restrained premium intelligence style with mint accent, charcoal typography, soft surfaces and generous whitespace.

## Architecture
A zero-build static SPA is used for the layout foundation: `index.html`, `styles.css`, `app.js`. Hash routing switches among Home, Politician, Compare and Admin. This avoids bringing legacy dependencies or server assumptions into phase 1 and provides a stable visual baseline for later functional layers.

## Constraints
- Do not copy legacy API code.
- Do not connect external data sources.
- Do not include legacy gateway, Redis, fallback or refresh logic.
- No dummy fallback masquerading as live data; fixture data is visibly marked as layout sample data.
- One failure in a future subsystem must not require changing this shell.
