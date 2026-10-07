# JCS 리얼택시 — rainy night update (466)

- Warm headlights, wet-road reflection, two rain layers and road droplets; reduced-motion support.
- Meter: fixed virtual 8 m/s (28.8 km/h), server-owned distanceMs, capped heartbeat accrual. First 1 second boarding excluded; pause/hidden intervals excluded. Old records derive distance from saved activeMs. Time retained as secondary record.
- Sixty prerecorded Korean dialogue MP3s plus four courtesy lines in each of two generic voices (68 files, ~4.7 MB). SunHiNeural for 나경원/김선민/이소영/용혜인; InJoonNeural for the other eight passengers. No impersonation. Synthesized with edge-tts at -8% rate. Hashed filenames omit passenger identity; API releases the current beat audio only. Server mapping module redirects away from static requests.
- Courtesy text follows the first narration once. Explicitly labeled game staging rather than historical quotation. Choices stay available during narration. Silent mode reveals the text after estimated reading time.
- Local Web Audio filtered rain/noise and roof droplets. No microphone access. Narration ducks rain; visibility and pause stop narration; per-channel mute persists locally. Playback failure exposes replay while keeping text gameplay available.
- User retains visual/audio/play QA. Implementation checks cover server distance, anonymity, audio asset integrity and narration state transitions.

Generation helpers: verification/taxi466-audio.mjs and verification/taxi466-generate.py (local tooling only; not runtime dependencies).
