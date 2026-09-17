# Parking Remaster v1 — Build State

## Fixed decisions
- Work only in Chat; do not switch to Work mode.
- Visual master: the first user-approved Parking Jam image only.
- Do not touch GRID SHIFT production files.
- Staging branch: `parking-remaster-v1-staging-20260917`.
- Final runtime target: lightweight HTML5, visual master as background, sprite atlas for moving cars, simple collision logic, single visible top EXIT.
- No redesign, no 3D pivot, no new benchmark mechanic during this build.

## Local canonical artifact set
- `index.html` — 11,849 bytes — SHA256 `12fd2fcb263c13d625730675b36d8098d2f929bedaae66a51f1b328ceb13dfd5`
- `assets/master.webp` — 448,118 bytes — SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`
- `assets/atlas.webp` — 148,094 bytes — SHA256 `87144f255b6917ea2bfcf69273e4633199aaea0606258e0a27f637bd576ba4b2`
- Total canonical payload: 608,061 bytes.

## Functional scope already implemented locally
- 10 tappable cars.
- Direction-aware blockage detection.
- Blocked-car bump feedback.
- Exit animation routes every released car toward the single visible top EXIT.
- Audio/vibration feedback.
- Hint pulse after inactivity.
- Win state and restart.
- QA hooks and auto-solve hook.

## Remaining gates
1. Transfer canonical binary assets + HTML to staging branch without altering their bytes.
2. Verify repository file sizes/checksums.
3. Open staging preview and verify initial render.
4. Verify blocked tap, legal exit, full solve, restart, portrait widths.
5. Only after all gates pass, merge/copy the isolated `parking-remaster-v1/` directory to main.
6. Verify GitHub Pages URL before reporting completion.

## Chat execution rule
Each Chat turn must finish a complete, resumable checkpoint before replying. Never reply with only “in progress”. If a tool boundary stops a step, record the exact completed commit/path/checksum here before replying, so the next turn resumes deterministically instead of redesigning the pipeline.
