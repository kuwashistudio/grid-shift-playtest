# Parking Remaster v1 — Build State

## Fixed decisions
- Work only in Chat; do not switch to Work mode.
- Visual master: the first user-approved Parking Jam image only.
- Do not touch GRID SHIFT production files.
- Staging branch: `parking-remaster-v1-staging-20260917`.
- Runtime: lightweight HTML5, visual master background, sprite atlas, simple collision logic, single top EXIT.
- No redesign, no 3D pivot, no new benchmark mechanic during this build.
- Execution rules are locked in `EXECUTION_RULES.md`.

## Completed gates
- G0 PASS — atomic Chat execution rules committed.
- G1 PASS — canonical artifacts reconstructed locally and byte-verified; manifest committed at `ASSET_MANIFEST.json`.
- Canonical runtime HTML is attached at `parking-remaster-v1/index.html` and was fetched back from staging.

## Canonical artifacts
- `index.html` — 11,849 bytes — SHA256 `12fd2fcb263c13d625730675b36d8098d2f929bedaae66a51f1b328ceb13dfd5`
- `assets/master.webp` — 448,118 bytes — SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0` — WebP 941x1672
- `assets/atlas.webp` — 148,094 bytes — SHA256 `87144f255b6917ea2bfcf69273e4633199aaea0606258e0a27f637bd576ba4b2` — WebP with alpha

## Functional scope implemented locally
- 10 tappable cars.
- Direction-aware blockage detection.
- Blocked-car bump feedback.
- Legal exit animation toward the single top EXIT.
- Audio/vibration feedback.
- Hint pulse after inactivity.
- Win state and restart.
- QA hooks and auto-solve hook.

## Remaining gates — fixed order
- G2 attach canonical `master.webp` to staging and verify bytes.
- G3 attach canonical `atlas.webp` to staging and verify bytes.
- G4 verify runtime asset loading and initial render.
- G5 verify blocked tap and legal exit interaction.
- G6 verify full solve, restart, and portrait widths.
- G7 copy only `parking-remaster-v1/` to main.
- G8 verify GitHub Pages URL.

## Chat execution rule
Advance one atomic gate per `進めて`. Never silently wait, never imply background execution, never bundle multiple long gates. If a gate cannot complete inside a bounded turn, split it before starting. Persist every PASS or blocker here before replying.
