# Home UI Task 1 review — re-review

## Disposition

No remaining scoped findings.

The previously reported high-severity avatar-anchor defect is resolved. Each measurement now queries the current `.home-compare-avatar` from its stable slot, so preview replacement and clearing no longer leave geometry tied to a detached node (`src/ui/compare-motion.js:25-33`). Resize observation is attached to the form and slots, while child-list mutation handling refreshes anchors after preview replacement (`src/ui/compare-motion.js:174-175`).

The new `layoutBounds()` path sums layout offsets to the form and therefore avoids transient WAAPI transforms when positioning the ground impact (`src/ui/compare-motion.js:15-23`). Its rectangle fallback preserves compatibility with test adapters. The same measured center is converted to slot-local coordinates through `--matchup-avatar-x`, and the select button centers on that coordinate (`css/home-refinements-158.css:26`). The restored 65px crack geometry and `top:-24.7px` place the SVG viewBox's y=38 fracture origin at the measured avatar-bottom anchor without stretching the original effect (`css/home-refinements-158.css:20-23`).

Regression coverage now replaces the avatar node before selection, checks the new node's anchor through a later resize, verifies select-button alignment, and proves that invalid transformed client rectangles do not displace layout-offset anchors (`tests/home-compare-motion.test.js:66-83`).

## Verification

The focused suite passes: 25 tests, 0 failures. Support-bridge structure, routes, and authored 80px white 50:50 styling matched the scoped requirements in static review. Browser use was excluded by task policy.
