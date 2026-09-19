# Parking Remaster v1 — Build State

Updated: 2026-09-19
Status: PHASE_1_CORE_FUN_PROOF / production_started=false
Branch: `parking-remaster-v1-staging-20260917`
Scope: `parking-remaster-v1/` plus dedicated workflows only. Do not modify GRID SHIFT production files.

## Current authoritative state

- Visual authority: `assets/master.webp`, 941x1672, SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`.
- VP-3 reusable car sprites: **PASS / CLOSED**. Ten production sprites exist in `assets/sprites/`; source/model details are in `VP_SPRITE_PRODUCTION_RESULT.json`.
- VP-2 clean plate: **PASS / CLOSED / LOCKED**. Production `assets/clean_plate.webp` is byte-identical to the approved VP-2E candidate, SHA256 `5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175`, 941x1672, 1,652,822 bytes.
- Level 1 runtime: **CLEAN PLATE + PERSISTENT PRODUCTION SPRITES / PASS / CLOSED**. The old patch/reveal architecture is removed from runtime; no patch DOM/network dependency remains.
- Level 1 solver/runtime parity: 1,024/1,024 states, mismatches 0.
- Instant Start + iOS AudioContext interruption recovery are implemented; final iPhone screen-recording audio verification remains PENDING.
- H1 failure mechanic: `shared_exit_conflict`, deterministic event-state machine, Python/JS parity PASS.
- Vertical Slice remains 12 Main + 2 optional Hard. Level 2 and bulk authoring remain locked.

## Active visual-production route

`STRUCTURED_ASPHALT_FIELD_PLUS_VECTOR_MARKINGS`

VP-2D global Hough structure model: **REJECTED AFTER ONE BOUNDED REPAIR**.
Machine execution succeeded, and the bounded repair improved known-asphalt/donor metrics, but direct overlay review still showed substantial vehicle/curb-edge contamination. Do not tune the Hough route again.

VP-2D2 Anchor-First Projective Marking Model: **PASS / CLOSED**.
- Initial generic corner/endpoint pass: FAIL (only A13/A17/A20/A23 of 24 candidates were unambiguous true parking paint).
- One bounded repair used: direct MASTER seed windows -> neutral-brightness snap -> Huber/residual-trim vector fit.
- Approved model: `PARKING_PROJECTIVE_MARKING_MODEL_V1.json`.
- 4 vertical tracks + 4 horizontal tracks.
- CI run `35423556122` SUCCESS; direct review of CI overlay PASS.
- No global Hough, learned detector, external image source, or generated image is used.
- A second VP-2D2 repair is not allowed.

VP-2E Structured Asphalt + Vector Marking Reconstruction: **PASS CANDIDATE / CLOSED**.
- Approved candidate: `assets/candidates/clean_plate_structured_v1.webp`.
- SHA256: `5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175`.
- CI run `35426568201` SUCCESS.
- Full-resolution Clean Plate review: PASS.
- 390px iPhone review: PASS.
- Production-sprite Level-1 rebuild, full resolution + iPhone: PASS.
- Outside removal mask max RGB delta after lossless WebP readback: 0.
- Tutorial yellow arrow/glow: 59,120 source-mask pixels -> 79 residual yellow pixels.
- No external imagery, learned inpainting, global Hough, Poisson or seamlessClone was used.
- Candidate is locked; do not tune it after this visual approval.

VP-2F Clean Plate Promotion Integrity: **PASS / CLOSED**.
- Production path: `assets/clean_plate.webp`.
- Same Git blob as approved candidate: `01c6a6b0ae1df57292beb76f33431eb53cca57ec`.
- SHA256: `5906db99473a51ebf49d21e1bc456869a6588dbec4a17012b8fc4748b7921175`.
- Dimensions: 941x1672.
- Bytes: 1,652,822.
- CI run `35427201597`: SUCCESS.
- candidate/production bytes: IDENTICAL.
- decoded RGB: IDENTICAL.
- WebP decode: PASS.
- Runtime unchanged; Level 2 unchanged.
- Production clean plate is locked. Do not regenerate/re-encode/overwrite it without reopening the visual-production gate.

VP-2G Runtime Clean Plate Migration: **PASS / CLOSED**.
- Runtime background: locked `assets/clean_plate.webp`.
- Cars: persistent `assets/sprites/{id}.webp` DOM elements created from Level Data.
- Old `assets/master.webp` rendering, `patch()`, `assets/patches/*`, and `tutorial_cover.webp` runtime dependencies: REMOVED.
- Dynamic first-focus hint replaces the baked tutorial arrow/glow and disappears on the first-focus red car action.
- Static runtime CI run `35427622680`: SUCCESS.
- 390x844 touch-emulated Chromium run `35427622654`: SUCCESS.
- Initial runtime: 10 cars / 0 patches / legal = green_tl, red_top, white_tr.
- First red_top tap: gameplay move starts, AudioContext created/running, same sprite animates, hint removed.
- Exit completion: 9 cars / 0 patches / red sprite reference cleared.
- Browser page errors: 0. Request failures: 0.
- Direct review of initial / mid-exit / after-exit screenshots: PASS.
- One bounded repair was used after the first browser run exposed a malformed migration tail; a permanent inline-JS `node --check` gate was added.
- Level-1 Python/JS solver parity remains 1,024/1,024.
- Real target-iPhone saved screen-recording audio remains PENDING and is not falsely closed by Chromium emulation.

Next exact gate: **Level 2 Controlled Authoring Proof**.
1. Create **Level 2 only**, role `easy`, schema v1.
2. No new mechanic; novelty_load = 0; hard_fail = false.
3. Author from `VERTICAL_SLICE_LEVEL_BRIEFS_V1.json`, not by cloning Level 1 blindly.
4. Run schema/solver/state validation, extract difficulty features, compare to Level-2 soft envelope, and perform visual/readability QA.
5. Measure production/revision effort before authoring Level 3.
6. Keep macro phase `PHASE_1_CORE_FUN_PROOF` and `production_started=false` until real target-iPhone/fresh-player evidence justifies promotion.

## Retired routes

Do not return to Adobe/Firefly, Telea, Navier-Stokes, xphoto FSR, any LaMa mask/margin tuning, Poisson/seamlessClone as the primary solution, rectified-plane generic inpainting, naïve exemplar mosaic fill, bmquilting patching, sprite regeneration, or the VP-2D global Hough-first detector.

## Stale-CI protection

A post-handoff one-shot workflow attempted to promote Independent Local LaMa margin 26 (run 35383429547), even though that exact method was already rejected by direct visual QA. That promotion is invalid under CANON and is removed/disabled by the 2026-09-19 consistency repair. Late CI may not overwrite a later human/visual decision.


## Level 2 Controlled Authoring Proof — PASS / CLOSED

- Canonical data: `levels/level_002.json`.
- Role: easy; schema v1; no new mechanic; novelty_load 0; hard fail false.
- Cars: 9.
- Initial legal choices: 4.
- Dependency depth: 2 moves.
- Mean legal choices: 3.000.
- Forced-state ratio: 0.072.
- Mean choice entropy: 1.483870 bits.
- Exact solution orders: 11,340.
- Reachable states: 126.
- Level-1 exact body-rect reuse: 0.
- Level-2 Python/JS parity: 512/512 states.
- Passing proof CI: `35428271296` SUCCESS.
- Direct full-lot + 390px production-sprite visual QA: PASS.
- One infrastructure repair was needed for old `.difficulty.json` sidecar filtering; Level-2 content itself required 0 post-CI revisions.
- Human difficulty/fun remains unproven until fresh-player evidence.
- Level 3 remains LOCKED.

Next exact gate: **Level 2 Runtime Progression Proof**.
1. Make runtime able to progress from Level 1 to Level 2 without a pre-game menu.
2. Keep Instant Start: initial load is still immediately playable Level 1.
3. Render Level 2 from the canonical bundled data and locked production sprites.
4. Cover/replace the baked Level-1 HUD number dynamically for Level 2 without changing the locked clean plate.
5. Verify clear -> Level 2 transition, restart semantics, touch targets, audio recovery, and Level-2 solver/runtime behavior.
6. Do not author Level 3 in the same gate.
