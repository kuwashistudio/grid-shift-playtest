# Parking Remaster v1 — Build State

Updated: 2026-09-19
Status: PHASE_1_CORE_FUN_PROOF / production_started=false
Branch: `parking-remaster-v1-staging-20260917`
Scope: `parking-remaster-v1/` plus dedicated workflows only. Do not modify GRID SHIFT production files.

## Current authoritative state

- Visual authority: `assets/master.webp`, 941x1672, SHA256 `535c114a9825fcbea2ca608f06246e5a5f5e954539506fe7e832c5c0b092b8d0`.
- VP-3 reusable car sprites: **PASS / CLOSED**. Ten production sprites exist in `assets/sprites/`; source/model details are in `VP_SPRITE_PRODUCTION_RESULT.json`.
- VP-2 clean plate: **BLOCKED / MISSING**. Do not treat any historical LaMa artifact as production-approved.
- Current runtime still contains the old Level-1 patch/reveal architecture. Do not migrate runtime until clean plate PASS.
- Level 1 solver/runtime parity: 1,024/1,024 states, mismatches 0.
- Instant Start + iOS AudioContext interruption recovery are implemented; final iPhone screen-recording audio verification remains PENDING.
- H1 failure mechanic: `shared_exit_conflict`, deterministic event-state machine, Python/JS parity PASS.
- Vertical Slice remains 12 Main + 2 optional Hard. Level 2 and bulk authoring remain locked.

## Active visual-production route

`STRUCTURED_ASPHALT_FIELD_PLUS_VECTOR_MARKINGS`

Next exact gate: VP-2D Parking Structure Model.
1. Detect visible parking-marking lines in the exact MASTER.
2. Group dominant line families and infer slot/grid structure.
3. Fit known-asphalt illumination only from valid pavement pixels.
4. Select multiple MASTER-only asphalt donor regions deterministically.
5. Persist the model as machine-readable artifacts and visually review the detection overlay on the MASTER.
6. Only then proceed to asphalt/marking reconstruction.

## Retired routes

Do not return to Adobe/Firefly, Telea, Navier-Stokes, xphoto FSR, any LaMa mask/margin tuning, Poisson/seamlessClone as the primary solution, rectified-plane generic inpainting, naïve exemplar mosaic fill, bmquilting patching, or sprite regeneration.

## Stale-CI protection

A post-handoff one-shot workflow attempted to promote Independent Local LaMa margin 26 (run 35383429547), even though that exact method was already rejected by direct visual QA. That promotion is invalid under CANON and is removed/disabled by the 2026-09-19 consistency repair. Late CI may not overwrite a later human/visual decision.
