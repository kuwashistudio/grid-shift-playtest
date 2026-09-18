# Parking Remaster — Level Balance & Progression v1

> This document is subordinate to `PRODUCTION_BLUEPRINT_V1.md`. If scope/order conflicts, the Production Blueprint wins.

Updated: 2026-09-18

## Goal
Create a parking-order puzzle that repeatedly cycles through confidence, tension, occasional failure, and fast retry without relying on arbitrary move limits, pay-to-win boosters, or deceptive difficulty.

This document separates:
- **Research observations** from competitors / game-design literature.
- **Design hypotheses** that must be validated with telemetry and playtests.

## Research observations

### Competitor scale and structure
- Parking Jam 3D has 100M+ Google Play installs and about 1.7M reviews. Long-term players report reaching 4,000+ levels, but also complain when large/boss-style boards become too frequent.
- One competing Parking Jam title advertises 10,000+ levels and explicit Boss levels.
- Car Out players report 2,500+ main levels; current reviews describe the main track as relatively accessible while more complex stages live in a separate Hard mode.
- Car Out reviews also show long engagement around level 898 when the game gets somewhat harder but remains very doable.
- Another traffic-jam title advertises 5,000 hand-tuned puzzles, from warm-ups to brain teasers, with undo/hints and short sessions.

### Repeated failure patterns in competitor reviews
- Too easy for too long -> boredom / uninstall.
- Near-impossible normal levels or booster-required levels -> frustration and distrust.
- Hundreds of levels using essentially the same board -> repetition.
- Large/boss levels appearing too often -> fatigue.
- Artificial move limits and forced booster/advertising dependencies -> perceived unfairness.
- Tiny or ambiguous touch targets -> accidental moves and undeserved failures.
- Hidden blockers / unclear walls -> failure feels like UI error rather than player error.

### Flow / difficulty research
- Mobile-game research on skill-challenge balance found that games near the player's perceived skill level produced the strongest skill/challenge balance; easy games produced the least flow, while overly hard play increased frustration.
- King publicly uses blocker statistics, Level Libraries, and Beat Charts to understand difficulty drivers and control when concepts are introduced or combined.
- Therefore raw car count alone must never be used as the difficulty metric.

## Content scale target — design hypothesis

The 144-level target is **locked behind production validation**. It is not the next implementation step.

Scale sequence:
1. **Vertical Slice: 12 Main + 2 optional Hard**
2. **Content Pilot: 30 Main + representative Hard**
3. **Fresh-player / controlled-release validation**
4. **Only after evidence supports the game: 120 Main + 24 optional Hard = 144 release levels**
5. Expand toward 300 and later 1,000+ only when solver/generator quality and real player behavior justify it.

Reason:
- Prove fun and repeatability before paying the cost of volume.
- Detect repetition and difficulty problems while content is still cheap to change.
- Keep optional Hard challenge from poisoning the Main progression.
- Follow the project-wide Production Blueprint rather than treating level count as a production mandate.

## Main-path progression

### Chapter structure
12 chapters x 10 Main levels.

Each 10-level chapter follows a difficulty wave instead of a straight ramp:

1. Recovery / confidence
2. Easy-normal
3. Normal
4. Normal
5. Small twist
6. Recovery-normal
7. Normal+
8. Challenge
9. Recovery / setup
10. Chapter peak

True large "Boss" boards occur only every **20 Main levels**, not every 10, to avoid boss fatigue.

After every Chapter Peak / Boss:
- Next Main level deliberately drops difficulty.
- New mechanic is not introduced on the immediate recovery level.

## First-attempt clear-rate targets — telemetry tuning targets, NOT research constants

These are starting hypotheses for playtest telemetry:

- Levels 1-5 onboarding: **95-100%**
- Levels 6-20: **80-90%**
- Levels 21-50: **70-85%**
- Levels 51-120 normal: **60-80%**
- Challenge levels: **50-65%**
- Boss levels: **40-55%**
- Optional Hard levels: **30-50%**
- Immediate recovery level after a spike: **85-95%**

If telemetry shows a level outside its band, the level is rebalanced or relocated; players are not blamed.

## Failure philosophy

### Main track
Do NOT create failure by:
- arbitrary move limits,
- invisible rules,
- random unsolvable states,
- booster requirements,
- tiny hitboxes,
- ad-gated continues.

Early Main levels have effectively no hard fail. A blocked tap gives readable bump feedback and the player can continue.

### Legitimate failure introduced later
Failure must be caused by a visible, understandable decision:
- collision with an explicitly visible moving pedestrian,
- collision with clearly visible crossing traffic / timed hazard,
- advanced levels where two released cars visibly share a conflict path and timing/order matters.

The first appearance of any failure mechanic is a safe teaching level.
A failure must be explainable from the screen without text.

### Retry
- Retry must be immediate.
- No forced ad before retry.
- Initial board restores deterministically.
- The failure cause should remain visually obvious for a short beat, then restart quickly.
- The player should be able to change one decision rather than replay a long amount of solved work.

## Difficulty model

Every level receives a machine-readable difficulty vector rather than a single hand-assigned "easy/hard" label.

Metrics:
1. **Car count** — total interactive vehicles.
2. **Dependency depth** — longest required blocker chain.
3. **Legal-choice count** — number of immediately valid cars.
4. **Decision ambiguity** — how many visually plausible but blocked/wrong choices exist.
5. **Critical ordering depth** — number of choices whose order materially matters.
6. **Hazard timing load** — number / speed / overlap of moving hazards.
7. **Visual density** — touch/visual crowding independent of puzzle logic.
8. **Recovery cost** — time/steps lost when the player makes the expected mistake.
9. **Novelty load** — number of mechanics not yet mastered.
10. **Solution duration** — expected clear time using canonical solution.

No Main level may spike more than one major difficulty dimension at the same time until late game.

## Mechanic introduction beat chart

### Levels 1-5
- Cars blocking cars only.
- Learn tap -> blocked bump -> legal exit -> clear.
- No hard failure.

### Levels 6-20
- Longer dependency chains.
- More legal choices.
- Slightly denser layouts.
- Still no hidden rule or hard timing pressure.

### Levels 21-40
- First clearly telegraphed pedestrian / moving hazard teaching sequence.
- One hazard concept at a time.
- Failure/retry becomes possible, but expected success remains high.

### Levels 41-70
- Ordering plus timing combinations.
- Different exit approach geometry.
- Occasional simultaneous-looking opportunities, but readable conflict paths.

### Levels 71-100
- Two mastered mechanics may combine.
- Longer dependencies and more false-but-readable choices.
- True Boss board every 20 levels.

### Levels 101-120
- Full combination of already-learned mechanics.
- No surprise rule introduced solely to make late levels harder.
- Final Main levels test mastery, not patience.

## Optional Hard track
- Unlock progressively from Main play.
- Never blocks Main progression.
- May combine mechanics earlier/more densely.
- No booster requirement.
- No intentionally impossible state.
- A Hard level is harder because reasoning/timing demands are higher, not because input tolerance is worse.

## Level generator + solver requirements
Before scaling beyond 144 curated levels, build:
1. Deterministic level JSON schema.
2. Solver that proves at least one complete solution.
3. Difficulty extractor producing the vector above.
4. Duplicate / near-duplicate detector.
5. Beat-chart validator that rejects mechanic introduction too early or repeated spike clusters.
6. Automated simulation for canonical solution time and legal-choice sequence.
7. Human visual-readability QA on representative iPhone viewport sizes.

Generated content is not publishable merely because it is solvable.

## Anti-frustration invariants
- 100% of published levels are solver-proven.
- Normal Main progression never requires a booster.
- Touch-target size is not a difficulty variable.
- Failure cause is visible.
- No random failure.
- No mandatory ad to retry.
- No two consecutive peak-difficulty Main levels.
- Boss is followed by recovery.
- New mechanic and major difficulty spike do not debut together.
- If a player fails repeatedly, the game should help understanding, not secretly alter physics or force monetization.

## Telemetry needed once playable
Per level:
- starts
- first-attempt clears
- total clears
- attempts-to-clear distribution
- median clear time
- blocked taps
- failure cause
- restart rate
- abandon rate
- next-level start rate
- hint exposure / use if hints are added later

Primary tuning signal is not "how many people fail"; it is:
**failure -> retry -> understanding -> eventual clear -> next-level continuation.**

A healthy hard level causes retries but still converts failures into subsequent clears.
