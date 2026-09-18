# Parking Remaster — Production Blueprint v1.0

Updated: 2026-09-18
Status: CANON
Current macro phase: PRE-PRODUCTION / VERTICAL SLICE

## Purpose

Parking Remaster is not allowed to drift into "finish the next technical task, then decide what comes next."
Every implementation task must belong to a macro production gate below.

The production philosophy is based on recurring practices from successful mobile-game studios and game-production literature:
- Supercell: Gameplay First; small autonomous teams; company playable; kill/pivot early; beta before global; retention over polish alone.
- King: theory/thought/tools/testing; Level Library; Beat Chart; data-driven level balancing and common difficulty language.
- Rovio: lifecycle from prototype through soft launch and LiveOps; analytics/platform capability available from early development.
- Wooga / mobile F2P postmortems: soft launch is an experiment to decide whether the product deserves global scale.
- Vertical Slice production practice: production begins only when the team can demonstrate both what the game is and how to build it repeatedly.
- Supercell Squad Busters 2026 learning: strong core-game beta results are insufficient if meta/long-term retention and real-market behavior are not validated.

## Non-negotiable production principle

**Prove before scaling.**

Do not build 144 levels because the plan says 144 levels.
Do not build production tools before the core experience needs them.
Do not polish systems that have not been proven useful.
Do not call a technically complete prototype a production-ready game.

Each phase has:
1. Player question.
2. Product risk being retired.
3. Deliverable.
4. Objective gate.
5. Explicit things that must NOT start yet.

---

# PHASE 0 — PRODUCT THESIS / MARKET MAP
Status: MOSTLY COMPLETE, keep current

## Player question
Why would someone choose another round of this instead of another Parking Jam-style game?

## Deliverables
- Competitor benchmark and review mining.
- Approved visual master.
- Core player promise.
- Platform/device constraints.
- Failure/retry philosophy.
- Initial difficulty and content hypothesis.
- Distribution constraints and technical limits.

## Gate
PASS only when the team can state in one paragraph:
- what the player does,
- why it feels good,
- what makes failure fair,
- why they retry,
- what differs from weak competitors.

## Do not start
- large content production,
- monetization systems,
- elaborate meta,
- hundreds of levels.

---

# PHASE 1 — CORE FUN PROOF
Status: ACTIVE through Level 1 runtime

## Player question
Is the core interaction immediately understandable and satisfying?

## Scope
Use the minimum content needed to prove:
- tap a car,
- blocked feedback,
- legal exit,
- visual/audio response,
- clear,
- restart,
- desire to perform another decision.

## Required evidence
- iPhone-first input works reliably.
- No ambiguous touch targets.
- No unexplained failure.
- Car exit feels satisfying rather than slow or ornamental.
- A fresh player can understand the action without reading instructions.
- Core game remains understandable with sound muted.
- Runtime is deterministic enough for automated QA.

## Gate
A Core Fun Review must explicitly answer:
- Did the player understand the first action?
- Did blocked feedback teach rather than punish?
- Did clearing a car feel rewarding?
- Was there avoidable waiting?
- Would a fresh player voluntarily continue?

Automation may prove correctness; only human playtesting can prove fun.

## Do not start
- 120 Main level production,
- 24 Hard level production,
- elaborate chapter map,
- LiveOps,
- ad economy.

---

# PHASE 2 — REPRESENTATIVE VERTICAL SLICE
Status: NEXT MACRO TARGET

## Why
A vertical slice is the transition gate from pre-production to production.
It must prove both:
1. what the final game feels like,
2. how the team can repeatedly make that quality.

## Parking Remaster vertical slice content
Build a **12 Main + 2 Hard** representative slice, not 144 levels.

The 12 Main levels must contain one complete difficulty waveform:
1. onboarding confidence,
2. easy,
3. easy-normal,
4. normal,
5. small twist,
6. recovery,
7. normal+,
8. first challenge,
9. recovery,
10. safe teaching of a genuine fail/retry mechanic,
11. challenge using that learned mechanic,
12. chapter peak.

The 2 optional Hard levels prove:
- optional challenge can be meaningfully harder,
- Main progression does not need to become hostile.

## Vertical Slice systems
- final-quality approved visual language,
- final-feeling input and feedback,
- audio grammar,
- restart / retry,
- win transition,
- progression to next level,
- one chapter transition,
- one genuine but fair fail/retry mechanic,
- basic persistence,
- level data format,
- telemetry event specification,
- iPhone viewport/performance proof.

## Vertical Slice Gate
PASS only if:
- all 14 levels are solver-proven,
- all 14 are visually reviewed,
- difficulty forms a deliberate wave,
- a fresh external player can progress without developer explanation,
- failure cause is visible,
- retry is immediate,
- no mandatory monetization interruption exists,
- production time/cost of one new level is measurable,
- known technical debt is bounded,
- target quality can be repeated.

If this gate fails, repair the slice. Do not scale content.

---

# PHASE 3 — CONTENT FACTORY / PRODUCTION PIPELINE
Status: NOT STARTED

## Player question
Can we create more good levels without quality collapsing?

## Required production tools
1. Level JSON schema.
2. Deterministic loader.
3. Solver proving at least one complete solution.
4. Difficulty-vector extractor.
5. Duplicate / near-duplicate detector.
6. Level Library.
7. Beat Chart.
8. Regression validator.
9. Screenshot / visual QA path.
10. Asset validation.
11. Telemetry schema.
12. Release manifest and rollback point.

## Gate
Produce a small batch with the pipeline and demonstrate:
- reproducible builds,
- stable production time,
- solver PASS,
- no duplicate-pattern flood,
- difficulty estimate correlates reasonably with human play,
- visual QA remains intact.

Do not optimize the factory for thousands of levels before this proof.

---

# PHASE 4 — CONTENT PILOT
Status: NOT STARTED

## Scope
Expand to **30 Main levels + representative Hard levels**, not 144 yet.

## Purpose
Prove:
- Beat Chart works across multiple chapters,
- difficulty does not drift,
- mechanic introductions are paced,
- recovery levels actually recover,
- content production does not become repetitive.

## Gate
Internal + external playtest of the 30-level pilot.

Review:
- first-attempt clear funnel,
- attempts-to-clear distribution,
- abandon points,
- blocked taps,
- restart behavior,
- retry-after-fail,
- clear-to-next-level continuation,
- median session length,
- repeated-layout complaints.

If the 30-level pilot is repetitive or the retry loop is weak, fix the system before producing 144.

---

# PHASE 5 — CLOSED EXTERNAL PLAYTEST
Status: NOT STARTED

## Principle
Fresh players reveal problems the creator can no longer see.

## Test questions
- Can players understand Level 1 without explanation?
- Where do they first fail?
- Does failure lead to retry or exit?
- Which levels are remembered as satisfying?
- Which failures feel unfair?
- When does repetition become noticeable?
- Do players voluntarily start another level/session?

## Rules
- Use real players outside the project context.
- Do not coach them while playing.
- Separate usability failure from puzzle failure.
- Record qualitative feedback alongside level funnel data.
- Treat tiny samples as directional, not statistical proof.

## Gate
Core comprehension and retry behavior are strong enough to justify controlled public testing.

---

# PHASE 6 — CONTROLLED RELEASE / SOFT LAUNCH
Status: NOT STARTED

## Purpose
Test the product, not just the build.

Use the target distribution platform's permitted/native metrics.
Do not add prohibited external analytics to a platform build.

## Validate
- actual player acquisition behavior,
- first-session progression,
- repeated sessions / retention where the platform exposes it,
- session duration,
- level funnel,
- retry conversion after failure,
- long-session fatigue,
- Hard-mode usage,
- technical crash/freeze/device issues.

## Critical lesson from successful studios
A short beta that proves only core gameplay is not enough evidence for long-term scale.
Do not confuse "people liked the first session" with "we have a game worth mass-producing."

## Gate
Only proceed when controlled-release evidence supports:
- core loop,
- progression,
- content pacing,
- technical stability,
- repeat play.

Otherwise pivot/repair/stop.

---

# PHASE 7 — FULL CONTENT PRODUCTION
Status: LOCKED UNTIL PHASE 6 PASS

## Initial content target after validation
- 120 Main
- 24 optional Hard
- 144 total curated/validated levels

This is a **post-validation production target**, not a pre-production todo list.

Scale path:
14-level Vertical Slice
→ 30-level Pilot
→ controlled public evidence
→ 144-level release content
→ 300
→ 1,000+
only if player behavior and production quality justify each expansion.

Every published level remains:
- solver-proven,
- Beat-Chart compliant,
- duplicate-screened,
- visually reviewed,
- assigned a deliberate difficulty role.

---

# PHASE 8 — RELEASE CANDIDATE / LAUNCH
Status: NOT STARTED

## Release gate
- target device QA,
- full content integrity,
- persistence,
- restart/recovery,
- no dead states,
- performance,
- distribution compliance,
- telemetry/metrics permitted by platform,
- rollback build,
- launch assets,
- privacy/legal requirements if applicable.

Global/public launch is a decision gate, not the automatic next step after content completion.

---

# PHASE 9 — LIVE TUNING / LIVEOPS
Status: NOT STARTED

## First priority
Fix real player pain before adding more systems.

Use actual data to:
- relocate difficulty spikes,
- replace repeated levels,
- improve bad tutorials,
- shorten frustrating retries,
- adjust hazard timing,
- repair device-specific input/performance problems.

## Only after stable repeat play
Consider:
- additional chapters,
- Daily/Challenge content,
- events,
- meta progression,
- monetization experiments appropriate to the platform.

LiveOps must not be used to hide a weak core loop.

---

# KILL / PIVOT CULTURE

Borrow the useful part of Supercell's approach:
a project is not protected simply because work has already been invested.

At every major gate ask:
- Is the core fun?
- Do players understand it?
- Do failures feel fair?
- Do they retry?
- Do they continue?
- Can we make more of it efficiently without repetition?
- Does real behavior support our assumptions?

If not, fix or pivot before adding volume.

Sunk cost is not evidence.

---

# PARKING REMASTER MACRO ROADMAP

CURRENT:
Phase 1 — Core Fun Proof

NEXT:
Phase 2 — 12 Main + 2 Hard Vertical Slice

THEN:
Phase 3 — Level Factory / Solver / Difficulty / Beat Chart

THEN:
Phase 4 — 30-level Content Pilot

THEN:
Phase 5 — External fresh-player test

THEN:
Phase 6 — Controlled release / soft launch

ONLY THEN:
Phase 7 — scale to 144 high-quality levels

The canonical MASTER asset transfer and current Level 1 hardening are sub-gates inside Phase 1/2. They may not consume unlimited project time or block higher-level production planning.

---

# RESEARCH BASIS

Primary / high-value references:
- Supercell, "10 Learnings from 10 Years" — Gameplay First, retention, small teams.
- Supercell company history — company playable, early kills, beta before global.
- Supercell, "The Best Games Haven't Been Made Yet" (2026) — Squad Busters: core beta/D7 validation was insufficient; meta/long-term retention and longer testing were needed.
- King / GDC, "Level Design Saga: Creating Levels for Casual Games" — theory, thought, tools, testing; data-driven level workflow.
- King level-design materials — Level Library and Beat Chart practices.
- King / GDC, "Blockers: Analyzing Difficulty Drivers in Candy Crush Games" — quantify difficulty drivers with common stats.
- Rovio — mobile F2P production from prototyping through soft launch and LiveOps; Beacon lifecycle tooling.
- Wooga / GDC, "What to Expect When You're Expecting a Soft Launch" — soft launch as product viability test.
- GDC, "The Vertical Slice Challenge" — vertical slice proves readiness to move from pre-production to production.
- Metacore — long-term return motivation / metagame can be a product-level design concern; do not treat core loop as the only retention system.
