# Parking Remaster — Vertical Slice Level Brief Policy v1

Updated: 2026-09-18
Status: CANON

## Research conclusion

Successful casual-puzzle production does not rely on a single magic difficulty number.

King's published level-design workflow explicitly balances multiple drivers, and its blocker research builds a shared statistical language for individual difficulty drivers rather than a single unexplained label. Research on puzzle games likewise shows that completion rate alone misses important player behavior, while newer mobile-puzzle modelling finds that simulated features become more accurate when combined with real cohort statistics.

Therefore these briefs use two layers:

### 1. Soft structural envelopes
Pre-playtest authoring hypotheses for:
- vehicle count
- dependency depth
- initial legal choices
- mean legal choices
- forced-state ratio
- mean choice entropy

A candidate outside a soft envelope is **reviewed**, not automatically declared bad.

### 2. Hard relational rules
The intended heartbeat/progression cannot be violated:
- recovery levels must structurally relax several dimensions;
- challenge levels must increase several dimensions;
- Level 10 must keep the underlying puzzle easy because shared_exit_conflict itself is the lesson;
- peak levels cannot introduce a new mechanic;
- optional Hard must remain optional and mechanically legible.

This follows the Heart Beat difficulty-curve principle: teach in an easy context, twist/reuse, spike, then provide relief.

## Why these ranges are intentionally broad

Only Level 1 currently has real measured Parking Remaster structural data.

Exact narrow targets for Levels 2–14 would therefore be false precision. The ranges are broad enough to guide controlled authoring while leaving room for the first human playtests to correct them.

They are not research constants and must not be quoted as universal "ideal difficulty" values.

## Baseline

Level 1 is measured, not guessed:
- dependency depth: 3 moves
- initial legal choices: 3
- mean legal choices: 2.640449
- forced-state ratio: 0.112360
- mean choice entropy: 1.291546 bits

It serves as a permissive onboarding reference only.

## Wave contracts

### 2 -> 5
Gradually increase ordering pressure without introducing new rules.

### 6
Recovery. It should relax at least three structural dimensions relative to Level 5.

### 7 -> 8
Rebuild, then spike. Level 8 must become more constrained across at least three structural dimensions than Level 7.

### 9
Strong recovery from Level 8. All four primary structural dimensions should move toward easier/more permissive play.

### 10
Teach shared_exit_conflict while the static puzzle remains easy. The player should fail because of the new visible consequence, not because the underlying ordering puzzle is already hard.

### 11 -> 12
Use the taught conflict mechanic under increasing ordering pressure. No additional failure rule appears.

### 13
Optional Hard pure reasoning with no shared_exit_conflict.

### 14
Optional Hard combines high ordering pressure with the already learned conflict mechanic.

## Candidate-level workflow

For each candidate level:
1. author from the brief, not from intuition alone;
2. run schema validation;
3. run Solver / state-machine validation;
4. extract Difficulty Features;
5. compare against the soft envelope;
6. compare against adjacent-level relational rules;
7. visual/readability QA;
8. human playtest.

Only player evidence can recalibrate these envelopes into stronger predictive targets.

## Next production step

Do **not** create Levels 2–14 in bulk.

Create **Level 2 only** as the first controlled-authoring proof, measure its production/revision time, validate it against the brief, and review whether the brief itself is useful before authoring Level 3.
