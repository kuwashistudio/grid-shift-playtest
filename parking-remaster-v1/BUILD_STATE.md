# Parking Remaster v1 — Build State

## Fixed decisions
- Work only in Chat; do not switch to Work mode.
- Visual master: first user-approved Parking Jam image only.
- Do not touch GRID SHIFT production files.
- Staging branch: `parking-remaster-v1-staging-20260917`.
- Runtime: lightweight HTML5 + approved master background + sprite atlas + simple collision logic + single top EXIT.
- No redesign, 3D pivot, or gameplay-mechanic drift during this build.
- Execution rules are locked in `EXECUTION_RULES.md`.

## Canonical artifacts
- `index.html` — 11,849 bytes — SHA256 `12fd2fcb263c13d625730675b36d8098d2f929bedaae66a51f1b328ceb13dfd5`
- `assets/master.webp` — 448,118 bytes — SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0` — WebP 941x1672
- `assets/atlas.webp` — 148,094 bytes — SHA256 `87144f255b6917ea2bfcf69273e4633199aaea0606258e0a27f637bd576ba4b2`
- Canonical `master.webp` can be deterministically regenerated from `/mnt/data/レベル1_駐車場脱出パズル.png` with Pillow WebP `quality=90, method=6`; regeneration was rechecked at exactly 448,118 bytes and the canonical SHA256 above.

## Completed gates
- G0 PASS — atomic Chat execution rules committed.
- G1 PASS — canonical artifacts reconstructed and verified locally.
- Runtime HTML is staged at `parking-remaster-v1/index.html` and fetched back successfully.
- G2a PASS — master part-00, 20,000 bytes, Git blob `bdb61612c0552e0a17b117c2366fa70fb9daa957`.
- G2b PASS — master part-01, 20,000 bytes, Git blob `53e51a67285f84739e73e44b99fa6e6025c96cf6`.
- G2c PASS — master part-02, 20,000 bytes, Git blob `7053a0dfd614dbf3f523771176cdf426605a6c23`.
- G2d PASS — master part-03, 20,000 bytes, Git blob `dc6b88a6fafadd20b57550dfc84c14487fe6d3bb`.
- G2e PASS — canonical part-04 transferred as verified halves because a direct write truncated: `part-04a` 10,000 bytes / Git blob `0aaa216a317f52048677c95170fa442c16a95e05`; `part-04b` 10,000 bytes / Git blob `8f2897e82fa90157697763c82e10ab27b8e11a87`. Ignore truncated `master.part-04.b64`.
- G2f PASS — master part-05, 20,000 bytes, Git blob `5cfcd7519dea5e680bc5013449c0fb3803a82fc5`.
- G2g PASS — master part-06, 20,000 bytes, Git blob `5d4772af4650a2d5233084eb7932391ea200d4ec`.
- G2h PASS — `master.part-07.b64` staged and verified at 20,000 bytes with Git blob `dd418eb48a2d07979a7727bf3bac6185cf6f167c`, exactly matching deterministic local part-07. SHA256 `85dc35f7763ea6889aa6ad52dbd3c239fb12da92587168e29a5a7593b9022170`. Earlier `part-07a` / `part-07b` repair halves may remain as redundant transfer artifacts and are not required for reconstruction.
- G2i PASS — `master.part-08.b64` staged via Git Data API and fetched back at exactly 20,000 chars; Git blob `2d21cc678cec1a352d3ba9336ec2e517cd63c70d`, exactly matching the locally computed Git blob SHA.

## Master transfer plan — optimized 2026-09-18
Canonical master base64 is 597,492 characters. Legacy transfer parts 00-08 remain valid evidence, but the one-20k-chunk-per-turn strategy is retired.
- Git Data API blob/tree/commit write was proven on part-08 and must be preferred over Contents API writes for binary/base64 transport.
- NEXT: G2J-FAST — probe and stage the largest safe remaining transport pack beginning at canonical offset 180,000 (part-09 start), targeting 100,000 characters first. If verified, continue in similarly large packs rather than one 20,000-char part per turn.
- After remaining canonical base64 is present, use deterministic automated assembly/decoding and verify final `assets/master.webp` is exactly 448,118 bytes with SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`.
- Existing canonical exception remains: legacy part-04 reconstructs from `part-04a + part-04b`; legacy full part-07 is canonical.
- After final binary verification, remove redundant transfer artifacts in one cleanup change.

## Functional scope already implemented locally
- 10 tappable cars, direction-aware blockage detection, blocked bump feedback, legal exit animation, audio/vibration, inactivity hint, win state/restart, QA hooks, auto-solve hook.

## Remaining fixed gate order
G2 complete master transfer/reconstruction -> G3 atlas transfer/verify -> G4 asset-load/render QA -> G5 interaction QA -> G6 full solve/restart/viewport QA -> G7 release only `parking-remaster-v1/` to main -> G8 verify GitHub Pages URL.

## Chat execution rule
One atomic subgate per `進めて`. No silent waiting, no background-work implication, no long bundled gates. Persist every PASS or explicit blocker here before replying.

## G2i blocker — RESOLVED 2026-09-18
- The approved source image became available in this Chat runtime at 941x1672 RGBA.
- Deterministic Pillow WebP `quality=90, method=6` regeneration produced exactly 448,118 bytes and canonical SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`.
- Canonical base64 length re-verified at 597,492 characters.
- Legacy parts 00-07 recomputed to the same known Git blob SHAs, proving source identity; part-08 computed Git blob SHA `2d21cc678cec1a352d3ba9336ec2e517cd63c70d`.
- `master.part-08.b64` was then written through Git Data API, attached to staging, fetched back, and verified at 20,000 chars with that exact blob SHA.
- Research-backed process correction: preserve small logical commits, but transport immutable binary data in the largest proven safe batch and automate deterministic reconstruction/hash QA.
- NEXT remains G2J-FAST as defined above; do not revert to one 20,000-char turn unless a larger Git-blob payload actually fails.
