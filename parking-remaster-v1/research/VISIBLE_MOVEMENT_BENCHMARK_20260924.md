# Visible Movement Benchmark — 2026-09-24

Status: PRE-P1-008 RESEARCH ONLY. This document does not authorize multi-car implementation and does not change P1-006/P1-007 Human gates.

## Question
Which movement rule should be carried forward as the first P1-008 candidate once P1-007 is Human-PASS, while keeping visible geometry, solver legality and rendered motion understandable as the same rule?

## Current-market evidence checked 2026-09-24

Google Play listings were used as current behavioral/product evidence, not as source code or permission to clone presentation assets.

- Car Parking Jam 3D: Move it! (Indiez Global; 10M+ installs, 417K reviews in the checked listing) describes choosing the right sequence, moving stuck cars out, limited moves in hard mode, and the satisfaction of cars finding their way out.
- Car Out! Traffic Parking Games (Tripledot; 10M+ installs, 111K reviews in the checked listing) remains a large current parking-jam benchmark family.
- Parking Jam 3D - Car Puzzle explicitly describes horizontal/vertical vehicle movement, correct-sequence clearing, no timer, and restart at any time.
- Tap Away (Popcore; 50M+ installs, 1.16M reviews in the checked listing) keeps the interaction model legible by making each tapped object leave according to a visible directional rule; its scale is useful evidence for the clarity of tap-to-remove directional puzzles, not evidence that Parking Remaster should copy its 3D block presentation.

Checked sources:
- https://play.google.com/store/apps/details?id=com.nostel.parking.car
- https://play.google.com/store/apps/details?id=com.flyingwhalegames.carout
- https://play.google.com/store/apps/details?id=parking.jam3d.traffic.jam.games.car.puzzle
- https://play.google.com/store/apps/details?id=com.jctswbglsm.SwipeAway

## Candidate comparison

### A. LONGITUDINAL_VISIBLE_CLEARANCE — KEEP AS BASELINE
A car may leave only along its visible longitudinal axis. Legality is determined by the swept collision body from current pose to the visible board boundary/declared visible exit corridor.

Strengths:
- The player can inspect the same corridor that the solver inspects.
- It maps naturally to the existing single-car straight-launch -> rear-snap -> exit performance grammar without allowing the snap to secretly change legality.
- Integer logical geometry can remain the authority; CSS/DOM geometry stays presentation-only.
- Blocked taps can be defined as zero logical displacement, which is simple to test and explain.

Risks:
- A visually decorative curved road must never imply that a blocked car can route around another car.
- Vehicle artwork/collision body mismatch can still create perceived unfairness; P1-008 must review visible footprint, not only numeric parity.

### B. CELL-STEP SLIDING
Cars slide one or more grid cells and remain on the board until a later move.

Strengths: classic sliding-block readability and deterministic solver model.

Reject as first P1-008 candidate because it changes the accepted single-car interaction from decisive tap/launch/exit into repeated repositioning and risks restoring the passive multi-step feel already rejected in old Level 1/2.

### C. FREE / CURVED STEERING TO EXIT
A car can follow a curved or dynamically selected path around blockers.

Reject. It recreates the hidden-ray/shared-Bezier class of mismatch: the visible car orientation no longer directly tells the player which geometry determines legality, and solver/runtime parity becomes harder to make perceptually obvious.

### D. SHARED EXIT QUEUE / OCCUPANCY
Multiple cars can be logically legal but wait for a shared hidden or semi-hidden exit resource.

Reject for the first prototype. It introduces passive waiting and a second legality system outside the visible swept corridor. The previous shared-exit conflict was explicitly rejected for core gameplay.

## Decision
Keep `LONGITUDINAL_VISIBLE_CLEARANCE` as the sole first-candidate baseline. Do not broaden P1-008 to multiple movement models. The future prototype remains capped at 2–3 cars and may only begin after P1-007 Human PASS.

The logical terminal rule should be: a legal tap commits one deterministic move whose legality is decided at tap time from Level Data; the rendered animation follows that already-decided visible corridor and snaps to the exact logical terminal state. Animation frames, viewport scale, orientation, AudioContext state, or hidden-tab timing must never change legality.

## Evidence required before P1-008 can claim quality
1. Python/JS legal-move parity on the same fixture.
2. Edge-touch blocking and one-unit-clearance cases.
3. Blocked tap = zero logical displacement.
4. Legal rendered sweep remains inside the declared visible corridor.
5. Resize/orientation/projection scale does not alter legal moves.
6. Target-iPhone Human review can identify a useful first move from visible geometry without explanation.
7. Accepted single-car motion/audio grammar is preserved; numeric PASS is not a substitute for Human feel.

## Sufficient research condition
Satisfied for movement-rule selection. Do not repeat this benchmark research unless a later Human test reveals a specific comprehension failure or a materially different rule is proposed. Next work on this topic should be fixture/validator/runtime evidence, not another market survey.