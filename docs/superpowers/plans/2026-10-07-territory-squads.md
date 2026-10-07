# Territory squads implementation plan

**Goal:** Each player commands all their mini avatars simultaneously; defenders visibly guard the building, attackers stand at a distance.
**Spec:** User correction authorizes multi-unit player rosters and clear siege formations. Continue implementation/deployment; user owns visual/play QA.
**Decisions:** Every account gets 18 units (six existing appearances, three each). Free in points, deploy consumes 1 energy per unit. Individual, selected and all-unit deployment/recall supported. Collective thresholds count real deployed units, including multiple units owned by one account. Distinguish units versus human commanders in counts. Owner party defends at building foreground/flanks; all other parties attack farther away. Ownership changes automatically move formations. Neutral ground labeled contesting.
**Architecture:** Extend existing CAS actor/game state using fixed roster unit IDs and opaque owner IDs; safe migration from single presence; no paid unit purchase. Preserve existing paid action and receipt rules. Vigil commitment applies per unit; other units remain controllable. Bound shared scene and settle chronological passive influence efficiently.

- [x] Backend roster, batched atomic deployment/recall, ownership validation, collective semantics, migration and regression tests. 22 focused server tests pass.
- [x] Frontend selectable roster and batch controls, explicit costs, spatial assault/defense formations and distinguish commander/unit counts. Syntax checks pass; user retains visual/play QA.
- [ ] Integrate release 464, inspect code contracts, commit only owned files and deploy; check production readiness without browser/play QA.
