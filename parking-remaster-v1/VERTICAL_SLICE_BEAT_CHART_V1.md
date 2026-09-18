# Parking Remaster — Vertical Slice Beat Chart v1

Updated: 2026-09-18
Status: CANON
Parent: PRODUCTION_BLUEPRINT_V1.md / VERTICAL_SLICE_GATE_V1.md

## Research basis

The Beat Chart exists to make progression visible before level production begins.

King's published workflow uses a Level Library plus a Beat Chart to see where objects and concepts are introduced and used across many levels. The goal is not only file organization; it is to understand difficulty flow and whether a player has already seen a mechanic.

GDC's "Heart Beat" difficulty-curve pattern is directly relevant to Parking Remaster:
1. introduce a mechanic in an easy, playful level;
2. reuse and twist that mechanic across following levels;
3. create a meaningful difficulty spike once the player has learned it;
4. drop difficulty sharply afterward, often while introducing the next mechanic safely.

King community documentation of tutorial levels shows the same practical pattern: when a new feature is introduced, the level may deliberately be made easy so the player learns the feature itself rather than fighting normal difficulty at the same time.

Competitor reviews reinforce the opposite failure modes:
- repeated boards with no meaningful escalation become boring;
- endless easy levels cause uninstall;
- challenge that destroys too much prior progress makes retry feel punitive;
- unclear or repetitive boss/challenge structure produces fatigue.

Therefore Parking Remaster uses **difficulty waves + novelty isolation**, not a monotonic ramp.

## Slice shape

The representative Vertical Slice is:

- Levels 1–12: Main
- Levels 13–14: Optional Hard
- 14 total

The Main slice contains two small heartbeat waves:

### Wave A — Core mastery
1. onboarding
2. repeat
3. dependency growth
4. fewer choices
5. spatial twist
6. recovery
7. rebuild
8. reasoning challenge
9. strong recovery

### Wave B — First genuine fail/retry
10. safe introduction of one visible fail mechanic
11. learned-mechanic challenge
12. chapter peak using only already taught rules

Optional Hard:
13. pure reasoning hard test
14. combined mastery hard test

## Critical rule: new mechanic isolation

A major new mechanic may not debut on a peak/challenge level.

Level 10 is intentionally easy except for the newly introduced visible failure consequence.

The player should be able to fail once and immediately understand:
- what caused it;
- what decision should change;
- why retry is worthwhile.

No hidden rule, random failure, move-limit trap or booster dependency is allowed.

## Failure mechanic is deliberately unresolved

The Beat Chart reserves one slot for a visible fail/retry mechanic, but does **not** yet choose its exact implementation.

Candidates:
- crossing traffic;
- pedestrian crossing;
- visible conflict-path timing.

This decision remains research-gated.

Why:
- choosing the mechanic simply because competitors use pedestrians would be imitation without evidence;
- the approved visual master must not be compromised;
- the mechanic must create fair, readable failure rather than clutter;
- implementation is prohibited until the mechanic passes competitor/review/usability research.

## Difficulty dimensions by role

### Onboarding / Recovery
Expected structural direction:
- higher legal-choice count;
- lower forced-state ratio;
- shorter dependency depth;
- no simultaneous novelty + challenge;
- zero hard-fail recovery cost before Level 10.

### Normal / Twist
Increase one major difficulty dimension at a time:
- dependency depth OR
- lower branching OR
- spatial reframing.

Do not spike all three simultaneously.

### Challenge / Peak
May combine already mastered difficulty dimensions.
Must not introduce a major new mechanic.

### Optional Hard
May increase combinations and ordering/timing demand.
Must remain solver-valid, readable and optional.

## Production rule

This Beat Chart is a **brief generator**, not permission to mass-author 13 new levels.

Before each candidate level:
1. read its Beat Chart role;
2. set target structural features;
3. author controlled candidate;
4. run schema/Solver/Difficulty Features;
5. compare against adjacent levels;
6. reject if it violates waveform or novelty isolation;
7. human visual/play review.

## Evidence still required

The chart is a production hypothesis until fresh-player tests show:
- Level 6 and 9 actually feel like relief;
- Level 8 feels meaningfully harder than Level 7 without unfairness;
- Level 10 teaches failure rather than punishing;
- Level 11 causes informed retry;
- Level 12 feels like mastery rather than surprise;
- Hard levels are voluntarily chosen rather than perceived as required.

