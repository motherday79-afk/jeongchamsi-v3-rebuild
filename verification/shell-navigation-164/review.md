# Release 164 review

Decision: **Approved. No remaining Critical or Important blockers found.**

Reviewed the current source at `/workspace/scratch/b627f5328562/qa161/source-155` and the release diff against the exact `JCS_0_0_31_163.zip` baseline. Focus: navigation snapshot ownership, comparison controller detach/restore/resume, cached Home return, background section replacement, and shell styling scope. No production files were edited by the reviewer.

## Important findings resolved during review

1. **Completed fast search routes were never committed to history cache.** The new `committedRoute` guard made the successful same-query search replacement branch's early return skip snapshot capture. Changing a search filter/page, leaving it, then using Back would rerender instead of restoring the completed screen and scroll. The branch now calls `navigation.cacheCurrent()` before returning. A pure Node harness evaluates the actual app render function and actual navigation implementation: it failed before this fix and passes after it (`review-search-snapshot.mjs`, `review-search-green.txt`).
2. **Cached Home return did not reapply the desktop layout.** Navigating away restores original stylesheet media rules; the viewport controller has no DOM observer to reactivate them when the cached Home node returns. The cached Home branch now calls `setupDesktopHomeViewport(document)` immediately after reattachment, before comparison anchor measurement, and refreshes font scaling. A pure Node harness evaluates the actual cached Home render branch with the real viewport controller: it failed before this fix and passes after it (`review-home-viewport.mjs`, corresponding red/green logs).

## Evidence

- Independently ran the navigation, restored-interaction, and comparison-motion test files: **31 passed, 0 failed**.
- Read the parent full-suite result: **243 passed, 0 failed**. This full-suite log preceded the two narrow app integration follow-ups above; the independent actual-branch harnesses pass with both final follow-ups applied.
- Confirmed the three original new regressions fail against 163 and pass in the current release: pending-route snapshot contamination, selected-pair motion resumption, and cached picker reconnection without duplicate form handlers.
- Current home comparison markup remains unchanged. Background reconciliation compares previous generated markup with fresh generated markup, so unchanged comparison rows retain current selections and search state; replaced rows now receive comparison and autocomplete initialization.
- HTML restoration removes stale decorative effect layers, hydrates selected hidden IDs, and creates a fresh controller. Cached live-node restoration reconnects the existing controller and listeners, with animation cancellation tokens preventing stale completions from taking ownership.
- Reviewed scoped CSS and shell markup: only the top-left logo is removed; its gradient slogan remains a Home link. Search, footer, and loading logo references remain. Footer gradient is restricted to the new name span; live pulse and loading PNG animation include reduced-motion overrides.

Validation limitation: this review used source inspection and pure unit/boundary tests only. It did not use a browser, preview, alternative renderer, deployment, or live data writes, and makes no claim of rendered pixel or animation-frame verification.

Parent final verification after both review fixes: npm test rerun completed with243passed,0failed; tests-final.txt contains the final-source run.
