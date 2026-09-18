# Parking Remaster — Independent Local Patch Experiment

Updated: 2026-09-19
Status: EXPERIMENT

## Why this experiment exists

Global LaMa removed cars but created large tonal rectangles.
Sequential local LaMa compounded previous generated errors.
Low-frequency correction prototypes were visually rejected.

This experiment tests a different production architecture:

**Every erase patch is inferred independently from the untouched approved MASTER.**

No generated patch becomes the input to another patch.

For each target car, neighboring car regions inside the local crop are also masked so the model does not copy adjacent vehicle pixels into the pavement. Only the target rectangle is retained as that car's patch.

The same process creates one independent tutorial-overlay patch.

If this works, the result is useful in two ways:
1. Level 1 can use car-specific reveal patches with high local quality.
2. Applying all ten patches produces a reusable clean-plate base for arbitrary sprite placement.

This would preserve the approved MASTER while avoiding one giant global inpainting problem.

## Gate

PASS is visual, not merely structural:
- all 10 cars gone;
- tutorial arrow/glow gone;
- no obvious seams;
- no colored car ghosts;
- parking lines remain coherent enough for final geometry cleanup;
- outside-union pixels unchanged.

No runtime change and no Level 2 authoring until direct visual QA.
