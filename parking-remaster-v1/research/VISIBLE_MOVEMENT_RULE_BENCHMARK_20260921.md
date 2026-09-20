# Visible Movement Rule Benchmark — 2026-09-21

Status: CLOSED RESEARCH CHECKPOINT / P1-008 PREREQUISITE ONLY

This checkpoint does **not** activate P1-008, does not implement multi-car gameplay, and does not alter P1-006/P1-007. It narrows the rule space so the later prototype can be solver/runtime-parity compatible once the single-car human gate permits it.

## Question

Which movement grammar best satisfies the rebuild requirement that visible geometry, legal/illegal movement, solver logic, and physical animation all describe the same rule?

## Current-market evidence reviewed

Google Play listings reviewed 2026-09-21:

- Popcore `Parking Jam 3D` (100M+ downloads shown in listing): cars must be moved in the correct order through a tight lot with obstacles.
- `Car Out! Traffic Parking Games` (10M+ downloads shown in listing): one-tap control; tap a car to drive it out; gentle-to-hard puzzle progression.
- `Car Parking Jam 3D: Move it!` (10M+ downloads shown in listing): cars are moved out of a jam with limited moves in some hard puzzles.
- Tap-away family listings: a visible arrow fixes the block's movement direction; an item is removable only when its path in that direction is open.
- A current Parking Jam variant explicitly describes tap-to-drive: if the path is clear the car automatically drives out; if blocked it bumps/returns.

The repeated transferable pattern is not a specific art treatment. It is **one visible movement axis/direction + path occupancy + order dependency + immediate tap commitment**.

## Candidate rules

### A. Fixed visible heading + straight clearance

- Each vehicle has a visible heading derived from its parked orientation.
- Tap commits movement forward along that heading only.
- Legal iff the swept vehicle footprint from start to board-exit corridor is collision-free.
- Animation follows exactly that swept path; no hidden ray different from the rendered trajectory.

Pros: strongest solver/runtime identity; one-tap; easiest fresh-player inference; deterministic; cheap to validate.
Risk: pure straight removal can look mechanically flat unless accepted single-car motion grammar is applied only after logical clearance is established.

### B. Visible heading + authored lane graph

- Vehicle first moves along its visible heading into a visibly marked lane, then follows a lane graph to exit.
- Legality is occupancy of the same visible lane graph.

Pros: can support richer car-like turns.
Risk: lane markings and graph topology must be unmistakable on the approved MASTER; otherwise this recreates the rejected hidden-path mismatch. More solver/runtime complexity.

### C. Free steering / drag

- Player drags or steers cars around obstacles.

Pros: physical agency.
Risk: abandons the one-tap/order-puzzle benchmark, complicates solver parity, collision precision and iPhone input, and weakens Instant Start clarity.

## Decision for future P1-008 prototype

**Candidate A is the reference rule to prototype first, once P1-007 permits P1-008.**

Formal contract:

1. `heading` is a Level Data field and is visibly inferable from vehicle orientation.
2. A tap never chooses a hidden route.
3. `sweptFootprint(vehicle, heading, state)` is the single collision primitive used by both independent solver and JS functional core.
4. `legal(vehicle, state)` is true iff that swept footprint reaches the defined visible board-exit boundary without intersecting another occupied footprint or explicit visible obstacle.
5. Runtime center path is the same straight displacement used by the logical sweep until the vehicle has crossed the logical exit boundary.
6. Any cinematic flourish after crossing the exit boundary is presentation-only and cannot change legality, collide with remaining puzzle objects, or make the pre-exit path appear to violate the rule.
7. A blocked tap must produce immediate, short visible feedback without pretending the car took a legal move; exact feel remains a later prototype/human-review matter.
8. No repeated multi-second passive exit wait may be required before the next logical action. Logical input unlock target for the later prototype: <= 350 ms after a legal tap unless simultaneous interactions prove unsafe.

## Required parity fixture before implementation

When P1-008 is unlocked, first create a tiny fixture with only these cases:

- `CLEAR_FORWARD`: one vehicle, unobstructed heading -> legal.
- `BLOCKED_NEAR`: blocker intersects swept footprint near start -> illegal.
- `BLOCKED_FAR`: blocker intersects same sweep farther ahead -> illegal.
- `SIDE_CLEAR`: adjacent object outside swept footprint -> legal.
- `UNLOCK_AFTER_REMOVE`: A blocks B; removing A changes B from illegal to legal.
- `EDGE_EXIT`: vehicle footprint crosses visible exit boundary without clipping a wall/obstacle -> legal.

Python solver and JS functional core must return identical legal sets and next states for every fixture. The rendered pre-exit center path must be generated from the same heading/displacement parameters, not from a separate Bezier route.

## Rejection criteria

Reject Candidate A at P1-008 if target-iPhone prototype evidence shows any of:

- orientation does not make heading obvious;
- a player-visible obstacle appears clear while the logical sweep says blocked, or vice versa;
- rendered pre-exit motion deviates from the logical sweep;
- repeated waiting dominates interaction;
- preserving V7.x satisfying motion requires a pre-exit turn that contradicts the straight rule.

If rejected, evaluate Candidate B next. Do not silently add hidden steering to Candidate A.

## Scope guard

No gameplay file, level, sprite, audio file, GRID SHIFT file, or production gate status is changed by this checkpoint. P1-006 remains USER-HOLD and P1-007/P1-008 remain blocked.