# JCS 0.0.31.162 focused review

Verdict: approve the API startup packaging hotfix. No blocking correctness or preservation issue found within the requested scope.

## Root cause and fix

The recorded baseline trace omits `src/data/cage-brush-metrics.js` and explicitly warns that it cannot resolve the query-bearing import in `src/core/cage-title-layout.js`. The dependency is reached through `api/gateway.js` → `lib/community-service.js` → the shared title-layout module. Both the isolated baseline-package run and the regression's recorded red run fail at API import with `ERR_MODULE_NOT_FOUND` for that exact metrics module. This is strong evidence of a packaging defect capable of making the homepage's gateway requests fail before their handlers execute.

The runtime fix removes only the browser query suffix from the shared module's metrics import and documents why. The metrics data, title geometry, handlers and storage readers are unchanged. A fresh, independent gateway-only trace includes all three relevant files: title layout, brush metrics and legacy title metrics. The query-resolution warning disappears. The share-only trace does not depend on the cage modules. Existing Redis optional-dependency warnings remain outside this change.

## Verification and boundaries

I ran `node --test tests/server-package.test.js` from the current source: 1 test passed, 0 failed, exit 0. The test copies the tracer's actual file list into a temporary package, then starts the packaged gateway in another process. Its helper executes the real health, banner, community and rankings GET handlers using an in-memory fixture at the Redis transport boundary. It strips inherited `JCS_` configuration, supplies fixture REST configuration, rejects unexpected fetch destinations and rejects every Redis command except GET/MGET. Assertions check stored banner text, a stored cage/post, a published ranking and unchanged fixture records.

This verifies local traced-package startup and these stored-data read paths. It does not verify deployment state, production Redis contents or connectivity, the native Redis transport, or visual rendering. The baseline defect plausibly explains the reported outage; the review does not establish the live deployment's exact state. I did not run the full suite, browser, ports, deployment or live database operations.

## Scope and preservation

I compared all existing files directly with the exact delivered `JCS_0_0_31_161.zip`: no files were missing; only the 13 listed existing files differ. Their changes are confined to the shared import/comment, release identifier, browser cache references and package manifests. The two additions are the packaging test and its fixture helper. Approved images, logos, badges, CSS, dimensions, campaign samples and data files are byte-for-byte unchanged. No production fixture, seed, storage key, sample-selection logic or write path changed.

All incoming browser imports of the changed modules use release 162, and the HTML entry uses 162. The unchanged browser-only brush metrics import can remain at 160 because its data file is unchanged; the shared server import is now a plain relative path. Existing `no-store` headers are unchanged.

The production dependency declarations are unchanged. Every pre-existing non-root lockfile package entry is identical to the baseline. All 39 newly added package entries are marked development-only; `@vercel/nft` is pinned to 1.11.0.

## Nonblocking test-maintenance observation

The regression traces gateway and share together but executes only gateway. A union package could conceal a future omission specific to one function. Separate per-entry package smoke tests would be stronger future coverage. This does not block this hotfix: the gateway-only trace independently includes the repaired dependency, and the recorded red run demonstrates that the current regression detects this exact failure.

No source edits were made during review. Final full-suite and deliverable packaging verification remain with the parent task.
