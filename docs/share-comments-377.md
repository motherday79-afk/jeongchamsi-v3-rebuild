# Public sharing and comic comments (377)

- Public detail routes have native share with clipboard/manual fallback. Existing board share menus are retained.
- Clean public URLs serve server-rendered Open Graph tags. Comics use the selected published episode image; sections including JCS surveys use their own 1200 × 630 card. Hidden comics do not expose their title or image.
- Political4컷 uses the established module action icon without adding navigation entries. Its reader uses the existing signed-in comment/reply/edit/delete system and atomic storage/reward handling. Comic editing remains super-admin only.
- Mine and Citizen Choice sidebar calls to action omit arrows and use compact padding.
- Preview display and cached refresh timing remain controlled by the receiving messenger/SMS app.

Validation: 46 focused sharing, comic, activity and sidebar tests pass, plus app startup and syntax checks. The older navigation snapshot test fails identically against the unmodified HEAD navigation module; no navigation history behavior was changed by this release (only comparison share URLs now retain four IDs).
