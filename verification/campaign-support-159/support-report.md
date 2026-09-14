# Campaign support task report

## Implemented specification

- Added native `support` and `funding` objects to campaign draft and published content.
- `support` schema: `recipientName`, legacy-compatible `associationName`, `bankName`, `accountNumber`, `accountHolder`, `officialUrl`, `sourceUrl`, `qrImageUrl`, `instructions`, `public`, `verified`.
- `funding` schema: `goalKrw`, `raisedKrw`, `supporterCount`, `asOf`, `sourceUrl`, `public`. Bundled examples also carry a server-owned `demo` marker in both objects.
- Amounts and counts accept only nonnegative safe whole integers; missing values remain `null`; a supplied goal must be positive. Published public funding requires an HTTPS source and a valid as-of date that is not in the future at publication time.
- Public support requires `public`, `verified`, a confirmed HTTPS source, a recipient/association name, and either an account number or official HTTPS link. Account-only and official-link-only publication paths are supported.
- Existing clients that omit `support` or `funding` preserve the stored draft values. An explicit empty object clears the corresponding section.
- Public detail DTOs omit private/unverified support and private/invalid funding. Public list DTOs contain only compact funding values and never contain support, account, contact, instruction, source URL, or QR data. Admin edit DTOs retain the editable draft.
- All five bundled fictional examples have distinct DEMO funding values. Service hydration restores canonical DEMO metadata to older saved example overrides and prevents client changes from removing the example identity. Demo UI contains no external URL or plausible account and all account, donation, and QR controls are disabled.
- Current detail pages keep the approved `이 제안에 공감하셨나요?` SUPPORT heading and show recipient, account copy, official recipient link, QR guide link, instructions, reported funding, source, and as-of data where permitted. Nonpolitical campaigns use the neutral `수령인 · 단체` label.
- Archive detail keeps the published funding snapshot and source while omitting account number, QR, copy, and donation actions. Over-goal text remains honest while the visual meter caps at 100%.
- Featured and grid cards receive a compact funding line without changing their photo/type structure.
- No payment collection, commission, bank synchronization, or automatic counter behavior was added.

## Files changed

- `src/core/campaign-model.js`
- `lib/campaign-service.js`
- `src/views/campaign-pages.js`
- `src/views/campaign-editor.js`
- `src/ui/campaign-interactions.js`
- `src/data/campaign-examples.js`
- `src/views/campaign-support.js` (new dedicated renderer)
- `css/campaign-support-159.css` (new dedicated stylesheet; parent must add this filename to the document CSS index)
- `tests/campaign-support.test.js` (new focused regression suite)
- `tests/campaign-service.test.js`
- `tests/campaign-pages.test.js`
- `tests/campaign-editor.test.js`

## Quality and regression coverage

The new tests cover normalization, integer/null/zero handling, positive goals, over-target progress, source and date validation, future snapshot rejection, public/private projection, account privacy in list DTOs, old-client preservation, explicit clearing, save/publish compatibility, stale-version coverage through the existing campaign CAS tests, demo restoration and inert controls, archived action removal, current copy behavior, and disabled copy behavior.

The renderer escapes all stored text, validates every outgoing URL through the campaign HTTPS rule, reports the uncapped textual percentage, and limits only the meter width. The service uses the bundled example as the authority for demo identity and metadata even when a saved override predates the new fields.

## Commands and results

1. Initial RED: `node --test tests/campaign-support.test.js` failed with `ERR_MODULE_NOT_FOUND` for the new renderer, confirming the new behavior was absent.
2. Focused campaign regression: `node --test tests/campaign*.test.js` — 74 passed, 0 failed.
3. Future as-of RED: `node --test tests/campaign-support.test.js` — 7 passed, 1 expected failure (`Missing expected exception`).
4. Full repository regression after implementation: `npm test` — 219 passed, 0 failed. The only console noise was npm's pre-existing `http-proxy` environment warning.
5. Final heading and renderer regression: `node --test tests/campaign-support.test.js tests/campaign-pages.test.js` — 28 passed, 0 failed.

No browser, live Redis, Blob write, deployment, checkout/reset, commit, or external write was used.

## Remaining integration concern

`css/campaign-support-159.css` must be linked by the parent index/cache-version pass. The parent also owns the separately planned CTA markup patch. Runtime behavior is otherwise covered by the full green test suite; visual browser QA was intentionally unavailable under the explicit browser policy block.

## Integration fix round 1

- Reworked `campaign-support-159.css` so every authored selector is scoped to `#jcs-campaign-preview` or `#jcs-campaign-directory`. The outer SUPPORT section retains the approved dark purple surface and white heading. Recipient, account, and progress inset panels now set explicit dark text colors, and the primary support actions use champagne gold. Featured-card progress uses a light gold text color on navy; white grid cards use dark purple.
- DEMO detail now shows the same recipient/bank/account/holder layout with unmistakably nonpayable values: `예시은행`, `예시-계좌번호`, and `인물명(예시)`. Copy, donation, and QR controls remain disabled with no live links or copy attributes.
- The five examples now report 38%, 67%, 24%, 82%, and 112% using goals of one through five million KRW and raised values of 380,000; 1,340,000; 720,000; 3,280,000; and 5,600,000 KRW.
- Example admin pages expose canonical bank/account/holder and funding values in disabled reference fields.
- Example saves and publishes discard client-provided support/funding before normalization, preserving the authoritative bundled metadata through validation. This fixes both full editable-DTO round trips and the shipped form path. Client `demo` fields on real campaigns remain ignored and cannot bypass validation.
- Public account publication now requires `bankName`, `accountNumber`, and `accountHolder` together. Partial account drafts remain valid; official-link-only publication remains valid without account fields. The editor error explains the three required account fields.
- New regression coverage exercises both example service round trips, canonical identity/number/privacy invariants, distinct DEMO ratios and nonpayable layout, disabled admin reference fields, partial-account rejection, official-link-only acceptance, real-campaign demo rejection, and authored CSS color/scoping contracts.

Round 1 focused command: `node --test tests/campaign-support.test.js tests/campaign-service.test.js` — 27 passed, 0 failed.

Round 1 full command: `npm test` — 224 passed, 0 failed. The only console noise was npm's pre-existing `http-proxy` environment warning.

### Final contrast adjustment

Darkened disabled DEMO action labels from `#736b76` to `#655b69` on `#e9e5eb`. `python3 /workspace/scratch/2c41bbae2f63/qa159/verify-contrast.py` completed with 21 checks and 0 failures.

The support renderer presents `qrImageUrl` as an external link labeled `수령인 QR 안내 보기`; it does not embed or display the QR image inline.

## Final review R1 fix

Fixed the real-campaign stored-index hydration boundary identified by independent review. The private Redis campaign index now retains the minimum funding eligibility metadata (`public` and `sourceUrl`) together with goal, raised amount, supporter count, and as-of date. When `service.list()` hydrates that private index entry, the existing public projection validates the source/date/public gates again and emits only compact progress values. Public list results continue to exclude source URLs, support data, account information, instructions, and QR information. Private funding remains absent.

Added a service-level publish → serialized private index → public list regression covering a real featured campaign, a general card with a known zero and missing supporter count, private funding exclusion, and an archived campaign. The test also asserts that no funding source or recipient/account fields reach either current or archive list results. Existing support tests continue to cover source and date rejection.

- Expected RED: `node --test tests/campaign-service.test.js` failed because persisted real `featured.funding` was `undefined`.
- Focused GREEN: `node --test tests/campaign-service.test.js tests/campaign-support.test.js` — 29 passed, 0 failed.
- Review patch: `/workspace/scratch/2c41bbae2f63/qa159/review-fix159.diff` (40 lines).
- Per final-review instructions, the full suite was not rerun for this bounded fix.
