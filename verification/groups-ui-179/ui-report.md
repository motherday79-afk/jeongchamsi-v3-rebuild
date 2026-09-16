# Groups UI 179 implementation report

## Scope completed

- Added an always-visible, routed `모임 목록으로` link to every group detail state, including locked and example groups.
- Reworked posts into notice-first compact rows showing title, author, date, and comment count. Each row expands to the body, media, comments, and existing permission-scoped actions.
- Wrapped the post composer in a collapsed native `details` panel opened by `글쓰기`; cancel closes it without resetting input and refuses to close while upload/save is active.
- Split gallery creation into a photo-first `사진 올리기` composer with a fixed hidden `gallery` kind. Editing preserves the post kind and existing image IDs.
- Reworked gallery thumbnails into expandable cards with a full image using `object-fit: contain`, description, metadata, comments, and existing edit/delete/moderation/report actions.
- Sorted events chronologically and rendered start/end time, place, description, attendance totals, RSVP, and permission-scoped actions in a dedicated layout.
- Added a collapsed `일정 등록` composer with title, required start, optional end, place, and description. Local datetime values serialize as Korea time; clearing an existing optional end sends an explicit empty value.
- Added clear empty states for post and event tabs.
- Added create-page guidance explaining that cover upload follows creation, plus settings guidance: `권장 1200×400px · JPG·PNG·WebP · 최대 2MB · 중앙 기준 자르기`.
- Added desktop/mobile styles while retaining the purple/gold theme and the existing 1180px page width.
- Applied the two-column desktop and single-column mobile form grid to both new and edit post/event forms; expanded event time rows across the grid and kept long body fields at least 240px tall.
- Kept opened gallery thumbnails compact while the expanded image uses its natural aspect ratio with `contain`.

## Files

- `src/views/group-pages.js`
- `src/ui/group-interactions.js`
- `css/groups-171.css`
- `tests/groups-ui-179.test.js`
- `tests/group-pages.test.js` (updated the superseded gallery composer expectation)

## TDD evidence

Initial focused run:

```text
node --test tests/groups-ui-179.test.js
tests 7, pass 0, fail 7
```

The failures corresponded to the absent return link, compact post/composer UI, gallery detail/composer UI, event end-time UI and ordering, cover guidance, cancel behavior, and layout CSS.

Final focused run:

```text
node --test tests/groups-ui-179.test.js tests/group-pages.test.js
tests 35, pass 35, fail 0
```

Full regression run:

```text
npm test
tests 473, pass 473, fail 0
```

The npm invocation emitted the repository environment warning `Unknown env config "http-proxy"`; tests themselves reported no failures, cancellations, or skips.

## Notes

- Existing optimistic version updates, upload concurrency guards, conflict acknowledgement, invite preservation, and activity request behavior remain in the same interaction flow.
- No backend privilege checks were changed.
- This workspace is not a Git checkout, so Git diff/status validation was unavailable as expected for the assigned environment.
