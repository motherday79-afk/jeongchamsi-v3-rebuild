# Singing Forest 322 implementation plan

Goal: launch an illustrated 5-lane rhythm game with the user-provided READY GO track, three charts, and daily completion.
Architecture: shared deterministic chart/judgment module; browser Web Audio transport and canvas rendering; server start/finish replay through existing mine transaction. No gold rewards. Reuse navigation, audio preference and title registry.
Approved brief: prior user approved location (forest above mine), D/F/Space/J/K + touch, three difficulties, one-song clear daily. Latest correction: quest names use decorative typography without panels; destination buttons retain panels.

- [x] Acquire user-provided track and preserve provenance; analyze tempo/offset and create song chart.
- [x] Create illustrated forest scene and title, text-only quest headings.
- [x] Shared rules/tests: input timing, hold notes, misses/extra-hit penalty, 70% clear, deterministic replay.
- [x] Server run IDs, difficulty validation, elapsed-time check, idempotent completion and Korean midnight daily state; no currency change.
- [x] Browser: 5 lanes, countdown, three modes, touch/keyboard, pause/resume, mute, +/-200ms calibration, score/combo/result/retry, cleanup on back.
- [x] Integrate forest world landmark, fullscreen title/header, daily quest 5 total; text-only quest headings.
- [x] Necessary rules/service/navigation/audio regression checks and syntax checks. User does visual/play QA.
- [x] Commit, push production branch, create patch/full archives.

Choices: 70% weighted accuracy to clear; no entry cap initially. Maximum two simultaneous notes for touch usability. Pausing must freeze audio/chart together and release held keys without free hold credit. Sound follows existing mute preference. Server recomputes scores from bounded timestamped input, not client supplied totals. This prevents simple result spoofing but is not bot detection.

Ruling: User supplied READY GO! 박감독의 레디고!.mp3, replacing inaccessible Pixabay track. Full 225.489 seconds, 130 BPM with onset phase ~307ms.
Ruling: All five quest item names use isolated illustrated typography, destinations keep signs as requested.

