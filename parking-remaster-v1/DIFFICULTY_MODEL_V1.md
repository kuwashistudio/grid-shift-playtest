# Parking Remaster — Difficulty Model v1

Updated: 2026-09-18
Status: CANON RESEARCH / IMPLEMENTATION CONTRACT
Parent: PRODUCTION_BLUEPRINT_V1.md / LEVEL_PIPELINE_V1.md

## Research conclusion

Parking Remaster must not collapse level difficulty into one invented score before player data exists.

King's published level-design material treats difficulty as the result of multiple tunable drivers: objectives, moves, colours and blockers. King's blocker work goes further by creating blocker statistics as a shared design language rather than treating "hard" as an unexplained label.

Puzzle-game research reaches the same conclusion from a data perspective:
- completion rate alone is an incomplete description of difficulty;
- action distributions inside a level provide richer information;
- more recent mobile-puzzle research reports stronger difficulty estimates when simulated structural data is combined with real player cohort statistics.

Therefore Difficulty Features v1 is a **feature vector**, not a final difficulty score.

## Structural features v1

### Vehicle count
Total interactive vehicles.
Useful for scale/cognitive load but never sufficient by itself.

### Dependency edge count
Number of blocker -> blocked relationships in the full initial geometry.

### Dependency depth
Longest blocker chain.
Reported as both vehicles in the chain and required dependency edges/moves.

Example Level 1:
green_tl -> black_ml -> silver_mid -> green_br
= 4 vehicles / 3 dependency steps.

### Initial legal choice count
How many cars may legally exit immediately.

Higher is usually more permissive, but human ambiguity must be measured later.

### Reachable state count
Number of unique board states reachable from the initial board using only legal moves.

### Reachable transition count
Number of legal state transitions in the reachable-state graph.

### Branch histogram
How many reachable nonterminal states expose 1, 2, 3... legal choices.

This preserves more information than only reporting the average.

### Mean legal choices
Average number of legal moves across reachable nonterminal states.

### Forced-state ratio
Fraction of reachable nonterminal states with exactly one legal move.

A higher value may create stronger ordering pressure, but can also reduce interesting choice. It is not automatically "harder."

### Mean choice entropy
Mean log2(number of legal choices) across reachable nonterminal states.

This is a structural proxy for decision breadth, not psychological uncertainty. Visual salience and player knowledge are not represented yet.

### Solution count / solution-order fraction
Exact complete legal clear orders, plus the fraction of all vehicle permutations that are valid.

Use as a flexibility/constraint feature only.
Do not infer human difficulty from solution count alone.

### Novelty load
Number of concepts marked as introduced by the level's design metadata.

This is a progression-pressure feature, not solver complexity.

### Hard-fail recovery cost
For Level 1 this is zero because there is no hard fail.

When visible failure mechanics are introduced, recovery cost must measure how much successful work/time the expected mistake destroys. It stays undefined until that mechanic is represented explicitly in Level Schema.

## Level 1 baseline

Level 1 currently measures:

- vehicles: 10
- initial legal choices: 3
- dependency edges: 9
- longest dependency chain: 4 vehicles / 3 steps
- reachable states: 90
- reachable transitions: 235
- mean legal choices: 2.640449
- forced-state ratio: 0.112360
- mean choice entropy: 1.291546 bits
- branch histogram: 1->10, 2->30, 3->33, 4->14, 5->2
- complete legal clear orders: 7,210
- hard-fail recovery cost: 0

This supports the design interpretation that Level 1 is permissive onboarding/confidence content.

## What v1 deliberately does NOT do

- no "Difficulty = 73/100"
- no automatic Easy/Normal/Hard assignment
- no player-skill inference
- no retention prediction
- no assumption that more branching means harder
- no assumption that fewer solutions means more enjoyable

Those would be false precision before playtest data.

## Calibration plan

### Vertical Slice
For Levels 1-14 collect:
- structural features v1
- designer target band
- fresh-player perceived difficulty
- attempts to clear
- blocked taps
- time to clear
- fail -> retry behavior where failure exists

Check whether feature ordering broadly agrees with human observations.

### 30-level Pilot
Add enough player observations to learn which structural features actually predict:
- first-attempt clear
- attempts-to-clear
- clear time
- abandon
- retry conversion

### Controlled release
Combine simulated/solver features with cohort statistics.
Only then consider a fitted composite difficulty estimate.

## LDP-4 gate

PASS requires:
1. deterministic extractor from canonical Level JSON;
2. Level 1 baseline persisted;
3. features explainable and separately inspectable;
4. no unsupported composite score;
5. later player-data calibration explicitly required.

