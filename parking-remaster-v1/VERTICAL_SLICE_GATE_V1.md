# Parking Remaster — Vertical Slice Greenlight Gate v1.0

Updated: 2026-09-18
Status: CANON
Parent: PRODUCTION_BLUEPRINT_V1.md

## Why this gate exists

The Vertical Slice is not a miniature finished game and not a content-count milestone.

The professional production purpose is to prove two things before scale:
1. **We know what player experience we are making.**
2. **We know how to make that experience repeatedly at the required quality/cost.**

This follows the production pattern documented by GDC vertical-slice practice and successful mobile studios:
- Volition/GDC: a Vertical Slice is a pre-production -> production readiness gate; it should represent the intended player experience at believable final quality and expose/quantify technical debt.
- GDC 2026 Production Workshop: pre-production deliverables include core mechanics/loops, tools/pipelines, major playables/Vertical Slice, and a detailed production plan before production.
- Supercell: Gameplay First; company playable and beta gates can still kill or fundamentally redesign a game.
- Brawl Stars: core controls, screen orientation, and progression were materially redesigned during an 18-month soft launch rather than being treated as sacred because implementation already existed.
- Squad Busters postmortem: strong core-game beta metrics alone were not sufficient evidence of durable product value.
- King: theory/thought/tools/testing and data-driven level iteration are needed before hundreds of levels become sustainable production.

## Greenlight decision

There are only three outcomes:
- **GREENLIGHT** — Production Phase may start.
- **REWORK** — Stay in pre-production and repair the slice.
- **PIVOT/KILL** — The current product thesis is not strong enough to justify scale.

There is no automatic greenlight because the code is complete.

---

# A. PLAYER EXPERIENCE PROOF

The 12 Main + 2 Hard slice must answer these questions with fresh-player evidence.

## A1 — First-touch comprehension
PASS when:
- a fresh player understands that cars must leave the lot without verbal coaching;
- first meaningful interaction happens immediately;
- blocked feedback is interpreted as "this path is blocked", not "the game ignored me";
- the player can identify a legal next action without reading a rules page.

## A2 — Moment-to-moment satisfaction
PASS when:
- legal car exit has clear visual response and no dead-feeling delay;
- blocked tap gives useful, brief feedback;
- touch feels reliable on target iPhone viewport sizes;
- audiovisual feedback improves satisfaction but sound/haptics are not required for comprehension.

## A3 — Fair failure
PASS when:
- genuine failure is introduced only after the no-fail core is understood;
- failure cause is visible before/at failure;
- after one failure, the player can explain what decision should change;
- no failure is caused by ambiguous hitboxes, hidden rules, random unsolvable state, or required monetization.

## A4 — Retry desire
PASS when:
- retry begins quickly;
- repeated work before the failed decision is limited;
- failure produces "I know what to try next" more often than "the game cheated";
- fresh players voluntarily retry representative challenge levels.

## A5 — Continuation desire
PASS when:
- players voluntarily start another level after a clear;
- the slice contains enough variation that Level 12 does not feel like Level 1 with more cars;
- optional Hard feels like chosen challenge, not mandatory punishment.

---

# B. DIFFICULTY / CONTENT PROOF

## B1 — Complete difficulty waveform
The Main slice must visibly demonstrate:
1. confidence/onboarding
2. easy
3. easy-normal
4. normal
5. small twist
6. recovery
7. normal+
8. challenge
9. recovery
10. safe teaching of genuine fail/retry
11. learned-mechanic challenge
12. chapter peak

The waveform must be observable in playtest data and qualitative feedback, not only in designer labels.

## B2 — Difficulty explainability
Every level has a machine-readable difficulty vector:
- car count
- dependency depth
- legal-choice count
- decision ambiguity
- critical-order depth
- hazard timing load
- visual density
- recovery cost
- novelty load
- expected solution duration

PASS when human difficulty ratings broadly agree with the ordering predicted by the vector.
If they diverge repeatedly, the model is not production-ready.

## B3 — Variety proof
PASS when:
- no two adjacent levels are near-duplicates in decision structure;
- the slice demonstrates at least three distinct reasoning patterns;
- visual variety never obscures collision/path readability;
- the hardest levels are not merely larger versions of easy levels.

---

# C. PRODUCTION REPEATABILITY PROOF

## C1 — Level data
PASS when every slice level is defined from a stable Level JSON/data schema rather than bespoke code edits.

## C2 — Solver
PASS when every published slice level is mechanically proven solvable.

The solver must also expose:
- canonical/valid solution sequence(s)
- initial legal moves
- dead-state detection where applicable
- expected dependency depth

## C3 — Level Library / Beat Chart
PASS when:
- all mechanics are catalogued;
- introduction/mastery/combination locations are explicit;
- difficulty peaks/recovery beats are visible across the chapter;
- a validator can reject obvious schedule violations.

## C4 — Duplicate detection
PASS when a tool can flag structurally near-identical candidate levels before human review.

## C5 — Measurable production cost
For at least several slice levels, record:
- design time
- implementation/data-entry time
- automated validation time
- human QA time
- revision count

Greenlight requires evidence that the intended quality can be reproduced without bespoke heroics.

---

# D. TECHNICAL PROOF

## D1 — Target-device stability
PASS on representative iPhone portrait sizes:
- correct viewport
- no unintended zoom/scroll
- stable touch
- no black/blank startup
- no frozen post-win state
- repeated restart/clear cycles do not corrupt state.

## D2 — Performance
PASS when:
- input handlers remain lightweight;
- car animation avoids layout-heavy per-frame motion where practical;
- repeated blocked taps cannot spawn unbounded visual/audio work;
- asset load does not visibly reflow the board.

## D3 — Determinism
PASS when:
- restart restores exact initial state;
- QA auto-solve and equivalent manual solution reach the same win state;
- mechanics that contain timing still have explicit, testable state rules.

## D4 — Technical debt register
Before greenlight, known debt must be listed as:
- MUST FIX before production
- SAFE DURING production
- DEFERRED

Unbounded/unknown technical debt is a REWORK result.

---

# E. EXTERNAL TEST PROOF

The project creator/developer is no longer an unbiased first-time player.

## Minimum protocol
Use fresh players who have not been coached on Parking Remaster.

For each test capture:
- first action
- first confusion
- first blocked tap
- first failure
- whether failure cause was understood
- retry/no-retry
- level where session stops
- spontaneous comments
- whether they choose Hard when offered

Do not explain controls unless the player is completely unable to proceed; that itself is evidence.

## Evidence classes
Separate:
- usability failure
- puzzle reasoning failure
- readability failure
- performance/technical failure
- boredom/repetition
- intentional difficulty

Do not "fix difficulty" when the true problem is input or communication.

---

# F. PRODUCT-RISK REGISTER

Production remains locked until these major risks have evidence.

1. **Core Fun Risk**
   - Is tapping/clearing cars intrinsically satisfying enough?

2. **Comprehension Risk**
   - Can a fresh player learn by playing rather than reading?

3. **Failure/Retry Risk**
   - Does fair failure increase engagement rather than cause exit?

4. **Difficulty-Wave Risk**
   - Can confidence, challenge and recovery be deliberately controlled?

5. **Variety Risk**
   - Can multiple levels feel meaningfully different without gimmick overload?

6. **Production Risk**
   - Can levels be produced/validated repeatedly without bespoke coding?

7. **Technical Risk**
   - Is iPhone HTML5 interaction stable across repeated sessions?

8. **Longer-Term Product Risk**
   - Does the chapter/progression structure create desire to continue beyond the first few levels?

The Vertical Slice must strongly retire risks 1-7.
Risk 8 must have a credible hypothesis and early evidence but requires later pilot/controlled-release validation.

---

# G. WHAT DOES NOT COUNT AS PROOF

These are useful, but individually do NOT greenlight production:
- Level 1 works.
- All assets are transferred.
- Solver says a level is solvable.
- Developer personally likes the game.
- The 14 levels are technically complete.
- A few friends say it looks good.
- One high retention metric from a tiny/biased sample.
- Competitors are successful.
- The project is already expensive/time-consuming.

Sunk cost is not evidence.

---

# H. GREENLIGHT SCORECARD

Production Greenlight requires ALL critical categories below:

- [ ] A1 First-touch comprehension
- [ ] A2 Moment-to-moment satisfaction
- [ ] A3 Fair failure
- [ ] A4 Retry desire
- [ ] A5 Continuation desire
- [ ] B1 Difficulty waveform
- [ ] B2 Difficulty explainability
- [ ] B3 Variety proof
- [ ] C1 Level data
- [ ] C2 Solver
- [ ] C3 Level Library / Beat Chart
- [ ] C4 Duplicate detection
- [ ] C5 Measurable production cost
- [ ] D1 Target-device stability
- [ ] D2 Performance
- [ ] D3 Determinism
- [ ] D4 Technical debt register
- [ ] E External fresh-player test completed

If any critical checkbox is missing:
**NO PRODUCTION GREENLIGHT.**

---

# Current consequence for Parking Remaster

Current asset/runtime work is only valuable insofar as it retires Phase 1 risks and enables this Vertical Slice.

Next macro sequence:
1. Finish the minimum reliable Level 1 runtime foundation.
2. Convert the game from bespoke Level 1 constants into stable level data.
3. Build solver/difficulty extraction before content volume.
4. Build representative 14-level slice.
5. Fresh-player test.
6. Greenlight/Rework/Pivot decision.
7. Only after Greenlight: content production pipeline and 30-level pilot.

