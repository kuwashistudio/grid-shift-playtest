# GRID SHIFT Runtime Canon

Gameplay freeze baseline: v1.7.2 (`dc4f3f72bc342322523867ca009ecd4c3883cb90`).
Safety branch: `freeze-v172`.

## v1.7.3 cleanup pass

No gameplay rule, scoring rule, spawn rule, save format, or approved presentation behavior is intentionally changed.

Removed from the runtime load order because later authoritative patches fully supersede them:

- `hotfix-v162.css` / `hotfix-v162.js` — old GRAVITY chain cinema, superseded by v167.
- `hotfix-v165.js` — old GRAVITY chain pacing, superseded by v167.
- `hotfix-v166.css` / `hotfix-v166.js` — first CHAIN GUIDE implementation, superseded by v167 + v168 + v170.
- `hotfix-v169.js` — first guide-resume patch, superseded by v170.

Deleted repository files that were already absent from the v1.7.2 runtime:

- v125, v126, v128
- v153, v154, v156

## Current authoritative late layers

- SHIFT: v149 + v150 + v152 + v155 + v157
- GRAVITY opening: v159
- GRAVITY tray geometry: v164
- GRAVITY guide/cinema: v167 + v168 + v170
- Unified reward feedback: v171
- PERFECT SQUARES: v172 + v172-fair

Further consolidation should happen only after an iPhone regression pass of v1.7.3.
