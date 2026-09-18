# Parking Remaster — H1 Visible Failure Mechanic Decision

Updated: 2026-09-18
Status: DECIDED
Selected mechanic: **shared_exit_conflict**

## Decision

The first genuine hard-fail mechanic in the Vertical Slice will be a deterministic conflict between **two cars launched by the player into the same clearly visible exit/merge zone**.

It will **not** use pedestrians or autonomous crossing traffic.

## Why pedestrians were rejected for the first failure mechanic

Competitor reviews show that pedestrians can add variety, but they repeatedly create the exact kind of failure Parking Remaster is trying to avoid:
- waiting for pedestrians breaks the fast parking-puzzle rhythm;
- players report pedestrians stopping or turning into a car after the player has already committed;
- collision attribution is sometimes perceived as wrong or overly generous;
- short timers combined with pedestrian waiting are especially frustrating.

This does not mean pedestrians are permanently forbidden. They are rejected as the **first taught hard-fail system** because they add autonomous motion, hitbox ambiguity and pacing risk at the same time.

## Why autonomous crossing traffic was rejected

Crossing traffic is visually understandable, but for the first fail mechanic it adds:
- an independent clock the player does not control;
- potential forced waiting;
- reaction/timing pressure before the ordering puzzle is fully mastered;
- additional animation and collision QA surface.

The game should not become a "wait for the opening" game this early.

## Why shared_exit_conflict was selected

It reuses the game's existing strongest language:
- cars;
- visible paths;
- player-triggered movement;
- order of release.

The player causes the failure directly by launching a second conflicting vehicle while the shared merge zone is occupied.

This has several advantages:
1. **Attributable failure** — no NPC can behave unexpectedly.
2. **Deterministic** — the same actions from the same state produce the same result.
3. **Low visual clutter** — no new character type is required.
4. **Low art risk** — preserves the approved Parking Remaster visual language.
5. **Natural progression** — extends "which car goes first?" into "which car goes now?"
6. **Solver-friendly** — conflict occupancy can be represented as explicit game state rather than hidden timing.
7. **Fast retry potential** — failure can be shown and reset without replaying a long sequence.

## Fairness contract

The implementation is not authorized unless all conditions are met:

- No RNG.
- No global countdown timer.
- No autonomous pedestrian or road-traffic actor.
- The shared conflict zone is visibly marked/telegraphed during the entire dangerous interval.
- A hard fail occurs only after a player explicitly launches a second vehicle whose declared conflict group is occupied.
- Level 10 must always provide at least one non-conflicting legal action while the conflict group is occupied; the teaching puzzle must not force idle waiting.
- Collision geometry must correspond to visually understandable car/path geometry; no invisible enlarged hazard box.
- Fail -> playable retry target: <= 1.5 seconds. This is a Parking Remaster product target, not a claimed universal research constant.
- Fresh-player test criterion: after the first failure, the player can explain the cause in one sentence without developer coaching.
- Level 10 teaches one conflict group only.
- Level 11 may require choosing between a conflict and another useful action.
- Level 12 may combine shared-exit conflict with deeper vehicle dependency, but introduces no additional failure rule.
- Level 14 may use the mechanic at optional-Hard density.

## State-model requirement

This mechanic must be data-driven.

Planned minimum state:
- conflict group ID;
- occupancy state (clear / occupied);
- occupying vehicle;
- deterministic clear condition;
- set of vehicles belonging to the group.

The Python solver and JavaScript functional core must both model this state and pass differential parity before a conflict level is published.

## What remains open

H1 is closed as a design decision, but implementation is not yet approved.

Next gate:
**H1-IMPL — extend Level Schema + functional core + Python solver with deterministic shared-exit-conflict state, then prove parity on synthetic fixtures before authoring Level 10.**
