# Android 167 review

Reviewed the recovered September 6 base plus September 13 swipe patch against `qa167/android-source`. Source review only; no device, emulator, browser, or production interaction.

## Findings and disposition

- **P2 — Readiness survived a main-frame navigation during the intro: resolved.** `android/src/com/jeongchamsi/preview/MainActivity.java:109–113` now calls `startup.navigating()` while invalidating pending callbacks. `StartupGate.java:10` clears current-document readiness and failure, retaining the original start time and sticky timeout. The new boundary test in `android/tests/StartupTest.java:10–12` covers ready → navigation → WAIT → newly ready. Re-read the actual fix and inspected the fresh SDK build log: all 3368 startup/animation checks pass. The previous page's readiness can no longer release a newly loading page through this code path.

- **P2 — Fixed launcher foreground dimensions could crop rays at smaller bounds: resolved.** The former centered 96dp × 64dp child did not scale with adaptive-icon bounds. The current `android/res/drawable/ic_launcher_foreground.xml:1–6` uses percentage insets and `fill`, preserving the source 3:2 aspect ratio across square layer sizes. Re-read the corrected XML; no residual fixed-dimension sizing issue remains. [Android LayerDrawable sizing](https://developer.android.com/reference/android/graphics/drawable/LayerDrawable#setLayerSize(int,int,int)) and [adaptive icon bounds](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable) support this correction. The fresh SDK build log proceeds through resource compilation and DEX verification with this XML.

**No open findings after follow-up review.**

## Checks and limits

- Gold PNG bytes remain SHA-256 `4d0922dc35204aa27260f35a05c4ed4f1aa5e5a871e5657de39f83b446a58e9e`, matching BRAND167 provenance. Source image is 1536 × 1024; no recoloring or redrawing occurs.
- Total intro of 2.3 seconds, with light after title lock at 1.34 seconds, was clarified as intended; light timing is not a finding.
- Existing back-layer code, ACTION_UP swipe-exit fix, cookie policy, external URL handling, minimal application ID, and Internet-only permissions are preserved.
- Inspected actual SDK35 build output, DEX verification, APK badging, and successful v2/v3 signature verification. Signing is explicitly a one-build preview key; stable update signing requires the existing supported signing-secret path.
- No additional concrete blocking build, security, or lifecycle defects found within this review scope. Runtime appearance and device navigation still require the stated physical-device checks.
