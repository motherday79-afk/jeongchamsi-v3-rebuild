# Campaign support, CTA and brand update implementation plan

> Execute with superpowers:subagent-driven-development. Retain the current source directory; user authorizes these changes and ZIP delivery.

**Goal:** Fix campaign action wording, show useful donation information and reported progress, promote CAMPAIGN in main navigation, and replace site brand marks with the supplied exact PNG.
**Spec:** Latest user message: featured CTA “이야기를 / 만나보세요”; four cards “이야기 / 만나보기”; example and real campaign donation account/progress surfaces; campaign above and generation below; all site logo locations use attached logo without shape changes.
**Architecture:** Extend existing campaign draft/public/CAS model with validated recipient information and externally reported funding snapshots. Reuse existing card/detail design. Keep payment processing outside this release. Use central brand renderer for exact PNG bytes and exchange primary/expanded navigation slots.

## Global constraints
- Baseline JCS_0_0_31_158; target159. Source /workspace/scratch/b627f5328562/qa161/source-155. No checkout/reset/deployment/live writes.
- Preserve badges, existing political data, original campaign photo bytes and main ad banner. Only new campaign example support metadata may be added to existing example data.
- Existing user authorization covers implementation; no renewed confirmation needed. Finishing means PATCH and FULL ZIPs with byte equivalence.
- Browser access previously explicitly blocked; no bypass. Source, geometry, CSS/event and persistence checks are available.
- Logo source /workspace/scratch/2c41bbae2f63/upload/ChatGPT Image 2026년 9월 15일 오전 01_32_31.png. RGBA1536x1024,500216bytes. Copy exactly; no redrawing, recoloring, or raster regeneration.

## Task1 — Campaign donation information and progress
Files: campaign-model.js, campaign service as needed, campaign-pages.js, campaign-editor.js, campaign-interactions.js; new focused support renderer/styles/tests; sample metadata.
- Add administrator recipient/account/link/QR/instructions and visibility/verification inputs and funding goal/raised/supporter count/as-of/source inputs. Native nested support/funding objects; existing routes/auth/CAS/publication history.
- Keep `support.associationName`, `officialUrl`, `sourceUrl`, `public`, `verified` compatibility. Recipient label for nonpolitics is recipient/organization. Account-only and official-link-only paths both work. Actual public info requires confirmed source; no missing-info placeholders.
- Financial values are safe nonnegative whole KRW/count integers; missing is null, not zero. Goal strictly positive if supplied; raised may exceed goal, textual percentage honest and visual meter capped100. Published funding requires source URL and actual as-of date, public flag. No claims of automatic bank synchronization.
- Public DTO excludes unpublished/unverified/private support and private funding. Admin DTO retains editable inputs. Public list carries only compact progress fields, never account/contact details. Preserve legacy support input when old client omits new fields; clear requires explicit empty object/flag.
- All5 fictional examples show distinct clearly labeled DEMO funding and nonpayable account illustration with disabled donation/copy/QR actions. No plausible operational example bank number, payment destination or real external links. Sample identity cannot be forged/removed through client content. Older saved example overrides missing new fields also receive only the sample demonstration.
- Detail follows existing purple/gold SUPPORT section; account info, copy-account action for real current campaigns, link/QR to recipient, progress raised/goal/%/supporter count/as-of/source. Archive keeps historical funding snapshot, disables donation actions and excludes stale QR/account copying.
- Add compact funding line to featured/card without redesigning layout; preserve original photos/type. Parent separately patches CTA markup after task1 completes.
- Cover normalization/privacy/admin save→publish/read/old-data compatibility/examples inert/zero/missing/over-target/stale-version/source-date and UI copy handler. Run focused regressions, report qa159/support-report.md. No payment collection/commission/auto-growth counter.

## Task2 — CTA, navigation and exact logo
Parent owns home-layout.js primary slots, service-icons.js, index and new CSS. Parent edits campaign-pages.js CTA only after task1 finishes.
- Investigated root cause: campaign-pages icon() returns jcs-icon, but directory CSS sizes jcd-icon only; intrinsic SVG consumes text space while directory inherits overflow-wrap:anywhere.
- Bound actual jcs-icon to15x15 flex:none. Mark each requested CTA word group in a nonwrapping line span; two lines exact. Preserve card full clickable area and intended arrow alignment.
- Replace generation primary nav slot with campaign; generation moves to expanded section. Maintain icon style, total primary count and routes; make catalog launcher metadata consistent. Neutral campaign description reflects people/projects.
- Replace central brandMarkSvg implementation with image reference to copied approved PNG, preserving aspect ratio and unfiltered original color/alpha. Header/search/footer all consume it. Audit other actual branding including metadata favicon/share targets; avoid touching unrelated star service/badge glyphs or raster advertisements.
- Verify reference bytes/hash, all shell marks source path, no old reconstructed ray paths; functional menu grouping check. Do not introduce low-impact tests that merely mirror a copy operation.

## Task3 — Integration and delivery
- Include159styles, bumprelease and cache import graph, retain original CSS.
- Full npm test, syntax/import/CSS checks; independent whole-release review, resolve concrete findings. Package158+159PATCH=159FULL, no deletion of old files.
- README distinguishes example/demo vs externally reported actual data, admin operational steps, browser/deployment limits; save both ZIPs.
