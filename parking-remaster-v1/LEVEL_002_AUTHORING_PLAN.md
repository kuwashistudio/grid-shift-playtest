# Level 2 Controlled Authoring Proof

Updated: 2026-09-19
Status: PASS / CLOSED

## Role
- id: level_002
- beat-chart role: easy
- schema: v1
- new mechanics: none
- novelty_load: 0
- hard fail: false

## Authoring rule
Level 2 repeats the mastered tap -> blocked bump -> legal exit -> clear grammar. It must not earn difficulty by new rules. The canonical brief is treated as a structural envelope, not a human-difficulty guarantee.

## Selected layout
Nine locked production cars are repositioned on the approved clean plate. No Level-2 logical body rectangle is an exact reuse of a Level-1 body rectangle. The layout intentionally opens four legal first moves while retaining short two-step dependency chains.

Pre-CI independent structural screen:
- vehicle_count: 9
- dependency_depth_moves: 2
- initial_legal_choice_count: 4
- mean_legal_choices: 3.000
- forced_state_ratio: 0.072
- mean_choice_entropy_bits: 1.483870
- exact complete clear orders: 11,340
- reachable states: 126

All six Level-2 soft-envelope fields are inside the canonical ranges.

## Research guard
King's public level-design workflow emphasizes theory, thought, tools and testing, and current mobile-puzzle difficulty research supports combining simulation with later player/cohort evidence. Therefore solver features are used for authoring control only; no claim is made that they prove human difficulty or fun.

## Gate
CI must prove schema, production-sprite hashes/layout readability, solver success, JS/Python parity, bundle sync and brief fit. Direct review of the CI-rendered full-lot and 390px lot preview must then PASS before Level 2 is closed.


## CI repair 1

Initial proof run `35428195203` passed Level-2 schema and layout checks, then exposed a pre-existing bundle-builder bug: `level_001.difficulty.json` matched the broad `level_*.json` glob and was treated as canonical level data. Level content was not the cause.

Bounded repair: both bundle generation and canonical-bundle validation now exclude `.analysis.json`, `.parity.json`, and `.difficulty.json` sidecars.


## Final proof

Passing CI run: `35428271296` (17 seconds, SUCCESS).

All required checks passed:
- schema v1;
- production sprite hashes and non-overlapping expanded hitboxes;
- generated bundle sync;
- exact solver;
- Level-2 brief hard + soft checks;
- all 512 Level-2 subset states Python/JS parity;
- production-sprite full-lot visual QA;
- 390px visual QA.

Exact results:
- 9 vehicles;
- 11,340 complete clear orders;
- 126 reachable states;
- dependency depth = 2 moves;
- initial legal choices = 4;
- mean legal choices = 3.000;
- forced-state ratio = 0.072;
- mean choice entropy = 1.483870 bits;
- novelty load = 0.

Direct visual review: PASS.

The locked clean plate's baked top HUD still reads Level 1 outside the lot crop. That is not hidden or treated as solved. The next gate must prove Level-2 runtime progression and dynamic level-number presentation without modifying the locked clean plate.
