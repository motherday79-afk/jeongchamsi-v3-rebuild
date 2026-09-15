# Approved campaign banner implementation plan

**Goal:** Show the three user-approved night-transit banner compositions in the existing sidebar slot and link the whole image to `/campaigns/example-002`.

**Spec:** The user approved the PC, mobile and unfolded Fold previews in this conversation. Use the existing generated images without creative changes. Keep the current campaign example and all unrelated assets/data intact.

**Architecture:** Replace the renderer's legacy sidebar artwork with the approved bundled campaign artwork. Preserve `designVersion: 'upload'` precedence, the existing hero renderer and the admin upload service. Use the existing SPA navigation attribute for campaign links. Match picture breakpoints to the existing slot ratios: up to 600px = 4:3, 601–1024px = 3:1, larger = PC.

**Tech stack:** Existing JavaScript modules, CSS, Node test runner; Pillow for deterministic resizing/WebP export only.

## Execution

- [x] Add `tests/campaign-sidebar-banner.test.js`: verify legacy replacement, missing data, future uploaded banners, unchanged hero markup, responsive sources, and actual campaign detail routing. Run it once before implementation.
- [x] Export approved PC image at 420×240 and 840×480 (2x); mobile at 720×540; unfolded Fold at 1200×400 into `assets/banners/campaign-night-transit-*-170.webp`. Record source hashes and output sizes.
- [x] Modify only `homeBanner` in `src/layout/home-layout.js`; select campaign assets when sidebar has no explicit uploaded artwork. Preserve admin editing. Recognize internal campaign URLs and retain external ad links.
- [x] Add scoped `object-fit: contain` for the campaign banner so narrow desktop columns cannot crop the approved copy. Keep the existing slot dimensions. Update changed browser import chains and release metadata to 170.
- [x] Run focused tests and the established full suite. Inspect resized assets. Verify patch files against the exact full 167 ZIP; no server, campaign data, badge, logo, CAGE or Android changes.
- [x] Package patch, full source and optional standalone upload-ready banners; save deliverables. State that these files require deployment, without claiming a live rollout.
