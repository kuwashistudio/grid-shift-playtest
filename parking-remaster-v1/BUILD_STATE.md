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
- G2 was split before transfer because direct binary upload is not exposed by the GitHub connector.
- G2a PASS — first canonical master transfer chunk staged at `parking-remaster-v1/.transfer/master.part-00.b64` and verified from the GitHub directory listing: 20,000 bytes, Git blob SHA `bdb61612c0552e0a17b117c2366fa70fb9daa957`, exactly matching the local source chunk.
- G2b PASS — `master.part-01.b64` staged and fetched back from GitHub. Verified 20,000 bytes and Git blob SHA `53e51a67285f84739e73e44b99fa6e6025c96cf6`, exactly matching the local deterministic chunk. Local chunk SHA256: `637e5682d935c9f2dabb128658e6da6ee18eaf34677fa740cc7ecd6817e72bb0`.

## Canonical artifacts
- `index.html` — 11,849 bytes — SHA256 `12fd2fcb263c13d625730675b36d8098d2f929bedaae66a51f1b328ceb13dfd5`
- `assets/master.webp` — 448,118 bytes — SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0` — WebP 941x1672
- `assets/atlas.webp` — 148,094 bytes — SHA256 `87144f255b6917ea2bfcf69273e4633199aaea0606258e0a27f637bd576ba4b2` — WebP with alpha

## Master transfer subgates
The canonical master base64 is 597,492 characters, pre-split locally into 30 deterministic text chunks (`part-00` ... `part-29`). Each full chunk is 20,000 characters except the final chunk. Each subgate must verify GitHub size/blob SHA before advancing.
- G2a PASS — part-00 staged and verified.
- G2b PASS — part-01 staged and verified.
- G2c NEXT — stage/verify part-02.
- Continue one verified chunk per turn through part-29.
- G2-final — reconstruct `assets/master.webp` from the verified chunks, verify 448,118 bytes and SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`, then remove transfer chunks.

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
- Complete G2 master transfer/reconstruction/byte verification.
- G3 attach canonical `atlas.webp` to staging and verify bytes.
- G4 verify runtime asset loading and initial render.
- G5 verify blocked tap and legal exit interaction.
- G6 verify full solve, restart, and portrait widths.
- G7 copy only `parking-remaster-v1/` to main.
- G8 verify GitHub Pages URL.

## Chat execution rule
Advance one atomic subgate per `進めて`. Never silently wait, never imply background execution, never bundle multiple long gates. If a gate cannot complete inside a bounded turn, split it before starting. Persist every PASS or blocker here before replying.
