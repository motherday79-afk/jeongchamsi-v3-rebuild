# Mining assets 277

Tool: built-in imagegen. Existing strong/glamour/elf/worker sprite sheets were visual references. Character identities and costumes were preserved. No new model/API credentials.

Player prompt shared across the three variants:

> Create a production game animation sprite sheet, genuine transparent background (no checkerboard). Preserve reference character identity, outfit, proportions and detailed polished 3D illustration style. EXACTLY 8 full-body frames in uniform 4 columns x 2 rows, row-major sequence. Each cell identical camera, scale, feet baseline and fixed planted foot anchors; generous margins keep entire pickaxe and body inside each cell. No borders, captions, ground, rock, text or extra objects. Facing RIGHT, gaze directed to an imaginary ore contact point at lower right, NOT looking at viewer. One coherent mining cycle: 1 ready watching ore, 2 small backswing with bent elbows, 3 raising axe with torso counterrotation, 4 apex overhead eyes locked down-right, 5 accelerated downswing torso bends, 6 contact at low-right with flexed knees and head angled down at tool tip, 7 small recoil looking at impact, 8 recovery to ready. Clearly differentiated in-between poses, consistent intact wooden shaft connected to metal pick head, two hands gripping throughout. Output sheet 2048x1536 landscape if possible.

Variant additions:

- Strong: Adult muscular man, preserve existing rugged miner design.
- Glamour: Adult woman, preserve her existing fully clothed outfit and high heel boots.
- Elf: Wholesome tiny childlike elf, fully covered work overalls, huge oversized pickaxe; preserve innocent reference design.

Strong correction: Replace the incomplete pickaxe in the bottom-left downswing frame with a complete connected metal head; retain identity, eight poses, outfit, gaze and transparent background, keeping all tools inside their frames.

Worker prompt:

> Create one production transparent PNG game character asset. Preserve exactly this friendly stocky adult worker with brown moustache, yellow miner helmet and lamp, cream shirt, blue denim overalls, brown gloves and boots, polished detailed 3D game illustration. He is TAKING A BREAK, sitting comfortably sideways on one short low wooden railway sleeper, feet relaxed forward, elbows resting on knees, hands relaxed, friendly restful face looking toward the right. His intact pickaxe lies safely horizontally beside his boots, NOT held for swinging. Entire body, helmet, boots, sleeper and pickaxe fully visible with ample transparent padding. Single character, no sprite sheet, no text, no cave background, genuine transparent background. Composition square, full body seated resting pose.

Output silhouettes are isolated from the transparent source and registered by the planted left boot. Each player sheet has eight 540×710 cells in one horizontal row, 4320×710 total. Native source scale is retained across poses. Sprite extraction checks all silhouettes fit their cells. Playback uses nine timed poses including return to frame zero and cancels outstanding callbacks on stop. This is illustrated frame animation, not a 3D rig.
