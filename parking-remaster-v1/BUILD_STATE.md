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
- Vertical Slice remains 12 Main + 2 optional Hard. Level 2 authoring + runtime progression are PASS; Level 3 and bulk authoring remain LOCKED pending Phase-1 physical-iPhone/fresh-player evidence.

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

Level 2 Runtime Progression Proof: **PASS / CLOSED**.
- Initial load remains immediate playable Level 1; no menu/start gate.
- Locked clean plate is unchanged.
- Dynamic DOM HUD covers the baked level label and renders LEVEL 1 / LEVEL 2 from current sequence.
- Level 1 clear automatically advances to Level 2 after the existing clear beat.
- Level 2 renders canonical 9-car data; initial legal set matches solver.
- Level 2 clear shows existing check/restart UI.
- Restart from Level 2 stays on Level 2 and restores the deterministic 9-car initial state.
- Static runtime CI `35428604081`: SUCCESS.
- Settled 390x844 touch browser run `35428737282`: SUCCESS.
- Level 1 JS/Python parity: 1,024/1,024.
- Level 2 JS/Python parity: 512/512.
- Page errors: 0; request failures: 0.
- Direct visual QA of Level 1, settled Level 2, Level 2 clear and settled Level 2 restart: PASS.
- Physical target-iPhone controls/audio verification remains PENDING.
- Fresh-player Core Fun Review remains PENDING.
- Level 3 remains LOCKED.

Next exact gate: **Target-iPhone Core Fun Evidence**.
1. Keep the current two-level runtime frozen except for test-enabling fixes.
2. Verify on a physical target iPhone that first controls are available within 1.0s.
3. Save an iPhone screen recording with microphone OFF and confirm engine/horn/win audio survives the recording.
4. Run at least one fresh-player observation without coaching: first action comprehension, blocked-feedback comprehension, avoidable waiting, desire to continue into Level 2.
5. Record evidence separately from solver/Chromium results; do not substitute emulation for physical/human evidence.
6. Do not author Level 3 until this Phase-1 evidence is reviewed.


## Target-iPhone Evidence Harness — PASS / PHYSICAL EVIDENCE PENDING

- Opt-in QA mode: `?qa=iphone`.
- Normal runtime: QA panel/hook absent.
- QA mode records navigation -> controls-ready ms, script -> controls-ready ms, first player action, AudioContext state/context/reset counts, engine/horn/win invocation counts, level/HUD/car count, progression and visibility lifecycle.
- COPY JSON exports a machine-readable evidence snapshot.
- Static regression CI `35429048848`: SUCCESS.
- Browser harness CI `35429048869`: SUCCESS.
- Browser reference only (not physical proof): nav -> controls 28ms; AudioContext running; engine=1, horn=1 after test actions.
- Direct screenshot review: PASS.
- Physical iPhone saved-recording audio remains PENDING.
- Fresh-player observation remains PENDING.
- Main branch currently has no `parking-remaster-v1/` folder, so a Pages-accessible isolated preview is not yet published.
- Level 3 remains LOCKED.

Next exact gate: **Isolated iPhone Preview Publish**.
1. Publish only the Parking Remaster runtime under a new `parking-remaster-v1/` subfolder on the Pages-serving branch.
2. Do not modify or replace GRID SHIFT root files.
3. Include only runtime-required assets plus `iphone_qa.js`; do not expose build/research internals unnecessarily.
4. Verify normal URL and `?qa=iphone` both load over the public Pages URL.
5. Only after public preview PASS perform physical iPhone recording / fresh-player evidence.


## Isolated iPhone Preview Publish — PASS / CLOSED

- GitHub Pages branch: `main`.
- New isolated folder only: `parking-remaster-v1/`.
- Published Pages commit: `fc56c6f471552a97038fa78df7271c35df237eda`.
- Pages build/deployment run `35429691411`: SUCCESS.
- Published runtime files: 15.
- Runtime files reuse the exact PASS staging Git blobs; no regeneration/re-encoding.
- GRID SHIFT root `index.html` before/after blob: `f0e258de3de4dcfa9cc91529a33722f4954a0d5d` — unchanged.
- Existing `parking-remaster/` folder was not modified.
- Normal preview: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/`.
- Physical QA preview: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/?qa=iphone`.
- Level 3 remains LOCKED.

Next exact gate: **Physical iPhone Evidence Capture**.
1. Open the QA preview on the target iPhone.
2. Start iOS screen recording with microphone OFF, return to Safari, reload once, and play enough to trigger horn + engine + Level-1 win.
3. Verify the saved Photos recording itself contains horn, engine and win audio.
4. Read `nav→controls` from the QA panel; target <=1000ms.
5. Tap COPY JSON and paste the JSON plus the three saved-recording audio yes/no results into Chat.
6. Do not author Level 3 yet; fresh-player evidence remains the following human-only checkpoint.


## REAL-DEVICE GAMEPLAY REVIEW — REJECTED (2026-09-19)

A physical iPhone screen recording invalidated the previous Core Fun direction.

The current runtime is **not accepted as a game-design proof**, even though its engineering gates passed.

Observed failures:
- legal/blocked logic is not visually aligned with the movement path;
- successful cars curve diagonally across parking geometry toward a shared exit;
- repeated ~2.45s removal animations make the loop mostly tap -> wait;
- blocking cannot be reasoned from what the player sees;
- cars are removed one-by-one rather than creating a legible traffic-jam interaction;
- Level progression/checkmark is technically correct but does not create gameplay.

**Current Level 1/2 gameplay design: REJECTED.**
**Level 3: FORBIDDEN.**
Fresh-player and physical-audio evidence on this rejected gameplay are no longer the next priority.

Keep:
- approved visual MASTER;
- locked clean plate;
- production sprites;
- useful Level Data / solver / CI infrastructure.

Reject as CANON:
- hidden directional blocker rule as the player-facing core;
- shared curved Bezier exit path;
- long one-car-at-a-time exit wait.

Next exact gate: **CORE GAMEPLAY REBUILD BENCHMARK** — research successful Parking Jam / car-out / tap-away mechanics, choose one visible physical rule, then prototype only a replacement Level 1.


## Single-Car Small-Lot Motion Prototype — PASS / USER VISUAL REVIEW NEXT

- Purpose-built isolated prototype only; rejected Level 1/2 gameplay remains rejected.
- One car starts centered inside a correctly dimensioned parking bay.
- Motion uses a kinematic bicycle model rather than Bezier/translate path animation.
- No independent lateral slide: position advances along current vehicle heading; heading changes from velocity / wheelbase / steering angle.
- Front wheels visibly steer; max steering is clamped to 30°.
- Vehicle accelerates, turns, straightens, and exits to the right.
- Dynamic shadow moves with the car instead of leaving a baked shadow behind.
- Browser proof run `35432226695`: SUCCESS.
- Visual proof reviewed: initial placement, turning frame, and exit direction PASS.
- Reference browser result: mid heading -1.011rad with steer 0.493rad; final heading -0.0054rad; max frame displacement 1.64px.
- Public prototype: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v1/`
- Pages deploy run `35432319789`: SUCCESS.
- GRID SHIFT root remains unchanged.
- This is **not** a puzzle, full-game, or final-art PASS.
- Level 3 remains LOCKED.

Next exact gate: **User Visual Motion Review**.
Judge only whether this single car now reads as a car actually driving/turning rather than an image sliding. Do not expand to multiple cars until that is accepted.


## Single-Car Reverse/Cutback Prototype — PASS / USER VISUAL REVIEW NEXT

- Still one car only; no multi-car puzzle yet.
- Start condition deliberately faces the car toward the wheel-stop/dead-end direction.
- Tap sequence is automatic only for motion proof: reverse straight -> reverse with steering -> full stop/shift -> forward with opposite countersteer -> straighten -> exit.
- Reverse uses signed negative velocity through the same kinematic bicycle model; no hand-authored lateral translation.
- Forward/reverse steering therefore produces different yaw response naturally.
- Reverse lamps appear while backing; brake lamps appear during the stop/shift phase.
- Browser proof run `35477892282`: SUCCESS.
- Max frame displacement: 1.52px; no teleport-like movement.
- Final heading: 0.076rad, approximately aligned with exit lane.
- Public prototype: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v2/`
- Pages deploy `35477981978`: SUCCESS.
- GRID SHIFT root remains unchanged.
- This is **not** yet a puzzle or final-art PASS. Old Level 1/2 gameplay remains REJECTED. Level 3 remains LOCKED.

Next exact gate: **User Visual Reverse/Cutback Review**.
Judge whether backing out, steering, stopping, shifting and driving away now reads as one coherent car maneuver. Do not add multiple cars until accepted.


## Fast Cutback Tempo — PASS / USER FEEL REVIEW NEXT

- User rejected v2 tempo as too constant and slow.
- Vehicle model remains kinematic bicycle; no return to Bezier/translate sliding.
- Tempo was rebuilt around aggressive acceleration/deceleration and very short shift dwell.
- Reverse straight target speed: -145.
- Reverse swing target speed: -128 with 30° max steering.
- Forward countersteer target speed: 158.
- Exit target speed: 195.
- Acceleration/deceleration limits: +620 / -520 units/s².
- Steering response rate: 14.
- Shift dwell: 0.08s minimum after near-stop.
- First fast-tune run `35482031154`: FAIL only because 3861.3ms missed the 3800ms tempo target by 61.3ms.
- Second tune run `35482085281`: SUCCESS.
- Full maneuver duration: **2774.5ms**, down from ~6772ms in the prior v2 proof (about 59% shorter).
- Max frame displacement: 3.26px; no teleport-like movement.
- Final heading: 0.071rad, still aligned with exit.
- Visual proof frames reviewed: PASS.
- Public Pages deploy `35482215715`: SUCCESS.
- Same public prototype URL: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v2/`
- GRID SHIFT root remains unchanged.
- Old rejected multi-car Level 1/2 remains rejected. Level 3 remains LOCKED.

Next exact gate: **User Feel Review — Fast Cutback**.
Judge whether the ~2.8s maneuver now feels fast/aggressive enough. Do not add multiple cars until the motion tempo itself is accepted.


## Compact Japanese-Style Drift Prototype — PASS / USER REFERENCE-MATCH REVIEW NEXT

- User rejected the ~2.8s fast grip/cutback as still completely wrong and supplied YouTube Shorts reference `_o8KZIu-Fzk`.
- Exact Shorts stream was not fetchable by the available web reader, so no frame-perfect reference claim is made.
- Research-confirmed drift grammar used here: initiate slide, allow body heading to diverge from velocity, countersteer to catch the rear, then accelerate out. External drift references also emphasize fast direction change.
- v3 replaces the old grip-only bicycle behavior with an explicit arcade slip model for the drift phase.
- Motion: hard launch -> handbrake-style flick -> rear slip / body yaw -> countersteer catch -> snap straight -> blast out.
- Rear-tire smoke and skid marks are rendered only during the slide.
- First drift run `35483357882`: FAIL because early slip was insufficient.
- Second run `35483413715`: SUCCESS.
- Full maneuver duration: **1828.6ms**.
- Max slip angle: **53.6°**.
- Max yaw state: 3.4.
- Max frame displacement: 5.59px; still below the 7px teleport gate.
- Final heading and velocity are aligned exactly with the rightward exit.
- Five-frame visual proof reviewed: initial / flick / counter / catch / exit.
- Public prototype: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v3/`
- Pages deploy `35483576704`: SUCCESS.
- GRID SHIFT root remains unchanged.
- Old multi-car Level 1/2 remains REJECTED. Level 3 remains LOCKED.

Next exact gate: **User Reference-Match Review — Compact Drift**.
Do not expand to multiple cars until the user accepts the drift feel/direction.


## Snap Drift V4 — PASS / USER FEEL REVIEW NEXT

- User rejected v3 because it still read as a smooth turn.
- Research gate completed before implementation; details in `DRIFT_MOTION_RESEARCH_V1.md`.
- Core correction: do not animate one continuous curved trajectory.
- V4 is four discrete beats: near-stationary rear pre-kick -> crossed-up straight blast -> front-axle-dominant rear snap catch -> immediate straight exit.
- Pre-kick browser measurement: front axle 2.13px, rear axle 34.55px (rear moves ~16.2x farther).
- Catch measurement: front 29.83px, rear 70.31px (rear moves ~2.36x farther).
- Rear smoke starts before meaningful launch and 81 smoke particles were emitted during the proof.
- Full maneuver duration: **1246.9ms**.
- No Bezier or smooth constant-radius path.
- Browser proof run `35484007514`: SUCCESS.
- Five-frame visual QA (initial / pre-kick / straight blast / catch / exit): PASS.
- Public prototype: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v4/`
- Pages deploy `35484089742`: SUCCESS.
- Exact linked YouTube Short could not be fetched by the current web reader; no frame-perfect-copy claim is made.
- GRID SHIFT root unchanged.
- Old multi-car Level 1/2 remains REJECTED. Level 3 remains LOCKED.

Next exact gate: **User Feel Review — Snap Drift V4**.
Do not add multiple cars until the rear-kick / straight-blast / snap-catch feel is accepted.


## Charge -> Straight Blast -> Rear Snap V5 — PASS / USER FEEL REVIEW NEXT

- V4 rejected by user because there was no readable anticipation and the vehicle's first motion appeared diagonal.
- Research separated two real phenomena that V4 had incorrectly blended:
  - rear-wheel wheelspin can create smoke while the vehicle is stationary / nearly stationary;
  - rear-end yaw is a separate lateral-grip-loss event.
- V5 hard invariant: **body heading cannot change at all during CHARGE or first STRAIGHT BLAST**.
- CHARGE: ~0.36s, center fixed, heading fixed, dense rear smoke buildup.
- STRAIGHT BLAST: ~0.22s, heading fixed, measured lateral X deviation exactly 0px.
- REAR SNAP: attitude change starts only after straight motion has been established.
- Snap proof: front axle moved 10.19px; rear axle moved 93.03px; rear/front ratio 9.13.
- EXIT: immediate second straight blast after alignment.
- Full motion duration: 1096.1ms including the visible charge.
- Browser proof run `35484442378`: SUCCESS.
- Direct screenshots reviewed: charge remains stationary/straight; first launch is vertical/straight; only later snap rotates the vehicle.
- Public prototype: `https://kuwashistudio.github.io/grid-shift-playtest/parking-remaster-v1/prototypes/single-car-lot-v5/`
- Pages deploy `35484512595`: SUCCESS.
- Research contract saved in `CHARGE_BLAST_SNAP_RESEARCH_V1.md`.
- GRID SHIFT root unchanged.
- Multi-car Level 1/2 remains REJECTED. Level 3 remains LOCKED.

Next exact gate: **User Feel Review — Charge / Straight Blast / Rear Snap V5**.
Do not add more cars until this motion grammar is accepted.
