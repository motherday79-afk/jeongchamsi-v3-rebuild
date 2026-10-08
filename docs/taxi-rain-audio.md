# JCS 리얼택시 — rainy night update (466)

- Warm headlights, wet-road reflection, two rain layers and road droplets; reduced-motion support.
- Meter: fixed virtual 8 m/s (28.8 km/h), server-owned distanceMs, capped heartbeat accrual. First 1 second boarding excluded; pause/hidden intervals excluded. Old records derive distance from saved activeMs. Time retained as secondary record.
- Sixty prerecorded Korean dialogue MP3s plus four courtesy lines in each of two generic voices (68 files, ~4.7 MB). SunHiNeural for 나경원/김선민/이소영/용혜인; InJoonNeural for the other eight passengers. No impersonation. Synthesized with edge-tts at -8% rate. Hashed filenames omit passenger identity; API releases the current beat audio only. Server mapping module redirects away from static requests.
- Courtesy text follows the first narration once. Explicitly labeled game staging rather than historical quotation. Choices stay available during narration. Silent mode reveals the text after estimated reading time.
- Local Web Audio filtered rain/noise and roof droplets. No microphone access. Narration ducks rain; visibility and pause stop narration; per-channel mute persists locally. Playback failure exposes replay while keeping text gameplay available.
- User retains visual/audio/play QA. Implementation checks cover server distance, anonymity, audio asset integrity and narration state transitions.

Generation helpers: verification/taxi466-audio.mjs and verification/taxi466-generate.py (local tooling only; not runtime dependencies).

## Conversational narration update (471)

- Approved greeting recordings are retained. First-story courtesy and final-story closing each have four variations per generic voice, about the length of a greeting.
- Sixty story recordings use -2% speech rate with 140 ms sentence pauses and 280 ms transitions after questions or before topic changes. Sentence timestamps include these pauses so automatic scrolling stays synchronized.
- Repetitive explanatory caveats were reduced in dialogue; source attribution and the reconstruction notice remain. Final remarks are staged game dialogue, not political quotations.
- Listening and gameplay acceptance remain with the user.

## Approved local voices (474)

- All 60 stories, 8 greetings and 16 courtesy/closing recordings now use Supertonic 3 locally: M1 for male passengers, F1 for female passengers. These are the two sample voices selected by the user. No paid API or per-play synthesis is involved.
- Generation uses the sample's 16 denoising steps and 1.0 speed. Sentences are rendered separately and joined with 180 ms pauses; sentence timings derive from the generated waveform lengths for scrolling.
- The model and generation libraries are local tooling, not shipped to the browser. Audio files are served as 96 kbps MP3s. Existing approved dialogue wording is retained.
- Model source: https://huggingface.co/supertone-oss-archive/supertonic-3 ; model license: BigScience Open RAIL-M. Runtime source: https://github.com/supertone-oss-archive/supertonic (MIT). The upstream project is archived; generated audio playback has no runtime dependency on its hosted services.
