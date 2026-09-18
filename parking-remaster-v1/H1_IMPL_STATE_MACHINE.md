# Parking Remaster — H1 Implementation State Machine

Updated: 2026-09-18
Status: IMPLEMENTED IN LOGIC / NOT YET USED BY A PUBLISHED LEVEL

## Research-derived implementation choice

The shared-exit failure mechanic is modeled as explicit state, not frame-position collision.

Game-loop literature warns that variable frame timing can create nondeterministic simulation results across devices. State-machine patterns are useful when behavior can be represented as a finite set of explicit states and transitions.

Parking Remaster therefore separates:
- **logical event state** — authoritative for win/fail;
- **animation time** — presentation only.

## State

A conflict group is either:
- clear; or
- occupied by the ID of one player-launched vehicle.

A conflict group has:
- id
- member vehicle IDs
- visible zone rectangle
- clear event = exit_complete

## Transitions

### launch(vehicle)
1. Check normal static blocker.
2. If statically blocked: ordinary blocked feedback.
3. If vehicle belongs to an occupied conflict group: deterministic hard fail.
4. Otherwise remove vehicle from active board state.
5. If it belongs to a conflict group, mark that group occupied by this vehicle.

### exit_complete(vehicle)
Clear every conflict group occupied by that vehicle.

The browser animation is responsible for emitting exit_complete when its exit animation finishes.
The fail rule itself does not inspect frame rate, position interpolation or wall-clock time.

## Fairness property

A conflict group is dangerous only while its first vehicle is visibly traversing the shared exit.

For the teaching level, there must be at least one safe non-conflicting action during occupancy. Thus the player is not forced to stare at an animation waiting for permission to act.

## Compatibility

- Level 1 remains schema v1 and its current behavior is unchanged.
- Conflict-capable levels use schema v2.
- Runtime core understands both; absence of conflict_groups means the feature is inert.
- No Level 10 content has been authored yet.

## Test fixture

tests/fixtures/shared_exit_conflict_v2.json contains:
- merge_a and merge_b in one conflict group;
- safe_c outside that group.

Required trace:
1. all three initially safe;
2. launch merge_a -> group occupied;
3. merge_b becomes risky, safe_c remains safe;
4. attempting merge_b -> conflict_fail;
5. launch safe_c -> succeeds while merge_a still occupies group;
6. exit_complete(merge_a) -> group clears;
7. merge_b becomes safe and launches.

Python and JavaScript implementations must produce the exact same trace before H1-IMPL can PASS.
