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
- G2 FINAL PASS — canonical `assets/master.webp` attached directly to staging as a 448,118-byte Git blob. Staging blob SHA `f0bc5be7d4ae9e4995eaa0302d6fd3ec2098babe`. GitHub Actions run `35318941198` completed successfully after the workflow verified exact byte size 448,118 and SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0` before committing. Temporary staging-only attach workflow was then removed.

## Master transfer status — COMPLETE 2026-09-18
- Legacy base64 transfer parts 00-08 remain on staging only as historical transfer evidence; they are no longer needed for reconstruction.
- The inefficient remaining part-09...29 transfer plan is CANCELLED.
- Canonical `assets/master.webp` now exists directly on staging and passed exact size/SHA256 verification.
- Before G7 release, remove legacy transfer artifacts so only production-needed files under `parking-remaster-v1/` are promoted to main.
- NEXT: G3 — transfer/verify canonical `assets/atlas.webp` using the same direct verified-asset strategy where possible; do not revert to manual micro-chunk transport.

## Functional scope already implemented locally
- 10 tappable cars, direction-aware blockage detection, blocked bump feedback, legal exit animation, audio/vibration, inactivity hint, win state/restart, QA hooks, auto-solve hook.

## Remaining fixed gate order
G2 PASS master attached/verified -> G3 atlas transfer/verify -> G4 asset-load/render QA -> G5 interaction QA -> G6 full solve/restart/viewport QA -> G7 clean transfer artifacts and release only `parking-remaster-v1/` to main -> G8 verify GitHub Pages URL.

## Chat execution rule
One atomic subgate per `進めて`. No silent waiting, no background-work implication, no long bundled gates. Persist every PASS or explicit blocker here before replying.

## G2 recovery summary — CLOSED
- The approved source image was recovered in this Chat runtime at 941x1672 RGBA.
- Deterministic WebP regeneration produced the canonical 448,118-byte file and expected SHA256.
- Direct staging attachment replaced the obsolete micro-chunk transfer path.
- Research-backed process rule: immutable assets should use direct verified transfer whenever possible; chunking is only a last-resort transport fallback and must be batched/automated.
