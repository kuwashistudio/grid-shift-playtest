# Visible Movement Benchmark — 2026-09-21

Scope: independent preparation for P1-008 only. This does **not** activate P1-007/P1-008, implement multi-car gameplay, or alter V7.3 audio/motion.

## Question
What interaction facts from current successful parking/tap-away products should constrain the later visible multi-car movement-rule prototype?

## Current primary/store evidence

1. **Parking Jam 3D (Popcore, Apple App Store, checked 2026-09-21)** describes choosing which car to move so it can find a smooth exit without hitting obstacles, moving cars in the right order, and satisfying outcomes both when cars reach the road and when a wrong order causes collisions. The current listing reports 50M+ installs and 479K App Store ratings. Source: https://apps.apple.com/us/app/parking-jam-3d/id1498229533
2. **Parking Jam: Car Out Puzzle (Puzzle1Studio, Apple App Store, checked 2026-09-21)** makes the legal action especially explicit: tap a car **with a clear path to the exit**; the order matters; there is no timer or move limit in the described base loop. Source: https://apps.apple.com/jp/app/parking-jam-car-out-puzzle/id6479278750
3. **Block Out - Tap Away (Apple App Store, checked 2026-09-21)** uses an explicit arrow on each object to show the direction it can move; tapping pushes it out when unobstructed. This is not a car game, but it is useful evidence for visible direction affordance in the Tap Away benchmark family. Source: https://apps.apple.com/us/app/block-out-tap-away/id6758319885
4. **Parking Jam (Nintendo official store, checked 2026-09-21)** describes clearing an overfilled lot by moving cars out of the way, with increasing complexity, and explicitly frames clearing the traffic jam as the satisfaction target. Source: https://www.nintendo.com/us/store/products/parking-jam-switch/

## Bounded conclusion

The shared interaction contract worth carrying into P1-008 is not a specific competitor path shape. It is:

- **visible direction**: before input, the player can infer the car's intended initial travel direction from its pose and board geometry; no hidden ray determines a contradictory direction;
- **visible clearance**: whether the immediate move is legal is explainable by visible occupied space / boundary / obstacle geometry;
- **direct action**: one tap/gesture on a legally movable object causes immediate visible motion; input is not followed by a long passive wait;
- **order consequence**: puzzle depth comes from choosing a useful order among visibly understandable moves, not from discovering invisible rules;
- **motion/logic identity**: the collision body/path used by solver/runtime must correspond to the path the player sees;
- **fast retry/comprehension**: failure may result from a bad order, but the cause must remain attributable to visible geometry.

## Candidate rule comparison for later P1-008

| Candidate | Visible before tap | Solver-friendly | Physical motion can match logic | Risk | Decision |
|---|---:|---:|---:|---|---|
| A. Straight clearance ray along car longitudinal axis to a visible exit corridor | Yes | High | High | Can become visually repetitive | **Preferred baseline** |
| B. Explicit lane/polyline painted in the lot and followed exactly by both solver and animation | Yes, if lane is actually drawn | High | High | Adds visual language not present in MASTER unless derived carefully | Reserve candidate |
| C. Hidden ray to shared Bezier/curve after tap | No | Medium | Low | Repeats rejected logic/visual mismatch | **Forbidden** |
| D. Free steering / drag-anywhere | Partly | Low | Medium | Changes product into dexterity/parking control; parity cost high | Reject for P1-008 |

## P1-008 prototype contract prepared here

When P1-007 eventually passes, the first multi-car prototype should test only the smallest rule proof:

1. two or three cars maximum;
2. each car has a deterministic longitudinal movement axis derived from Level Data;
3. legal move = swept visible collision body from current pose to the visible board/exit boundary is clear;
4. the exact same swept geometry is used by independent solver fixture and JS functional core;
5. animation samples remain inside that legal swept corridor until the accepted single-car exit grammar takes over;
6. blocked tap gives immediate visible feedback but does not move through blockers;
7. no hidden shared curve, invisible blocker, timer, pedestrian, meta, slots, or new failure mechanic is introduced in this prototype;
8. human quality acceptance remains separate from parity/numeric PASS.

## Sufficient condition / stop rule

This research topic is closed for pre-P1-008 preparation once the above contract is machine-readable and fail-closed testable. Do not repeat benchmark research for the same question unless current product evidence materially changes or P1-008 reveals a contradiction.
