# Real-Device Gameplay Rejection — 2026-09-19

Status: REJECTED / CORE GAMEPLAY INVALID

Evidence source:
- User-provided physical iPhone screen recording
- Duration: 46.833s
- Resolution: 512x1112
- Recorded on 2026-09-19

## Decision

The current two-level runtime is rejected as a game-design proof despite prior architecture/solver/runtime PASS results.

Those earlier PASS gates proved implementation integrity only:
- assets load;
- clean plate + sprites render;
- JS/Python state parity;
- Level 1 -> Level 2 progression;
- audio context/runtime hooks;
- mobile browser execution.

They did **not** prove that the interaction loop is a worthwhile game.

## Direct gameplay failures visible in the recording

1. **Physical motion and puzzle logic are disconnected.**
   Cars judged "legal" by hidden blocker logic then follow the same curved center-exit animation, regardless of their visual lane/orientation.

2. **Cars visibly cut across parking geometry.**
   Examples from the recording:
   - red car ~4.5–6.5s;
   - white car ~31.5–33.0s;
   - final green car ~40.0–41.75s.
   They rotate/curve across spaces and empty asphalt rather than moving according to a legible parking rule.

3. **The dominant interaction is tap -> wait.**
   Each successful removal animation lasts ~2.45s. Level 1 takes roughly forty seconds in the recording, with most of the time spent watching one car leave.

4. **Blocking is not visually inferable.**
   The player cannot reason from the board geometry why a given car is blocked because the blocker rule uses one direction while the actual exit animation uses a different path.

5. **There is no meaningful jam behavior.**
   Cars do not form a physically understandable traffic jam, do not move into newly opened lanes, and do not create satisfying chain reactions. The board mostly becomes emptier one car at a time.

6. **Progression is not gameplay.**
   The clear badge and automatic Level 2 transition work technically, but do not repair the weak core loop.

## Locked conclusion

- Current core-fun claim: INVALID.
- Current Level 1/2 gameplay design: REJECTED.
- Level 3 authoring: FORBIDDEN.
- Fresh-player test on this gameplay: NOT WORTH RUNNING.
- Physical audio/timing gate: no longer the priority.
- Preserve the approved visual assets/clean plate/sprite extraction work as reusable production assets.
- Preserve solver/runtime infrastructure only where it remains useful.
- Do not preserve the current hidden-ray blocker + shared Bezier exit mechanic as CANON.

## Next exact gate

**CORE GAMEPLAY REBUILD BENCHMARK**

Before changing runtime:
1. Re-benchmark successful Parking Jam / car-out / tap-away mobile mechanics from actual gameplay.
2. Define one visible rule where board geometry and legal/illegal movement are the same thing.
3. Define movement that is immediate and physically readable.
4. Eliminate the repeated ~2.45s passive wait.
5. Prototype the new rule using the existing clean plate + sprites only after the rule is explicit.
6. Do not author more levels until one new Level 1 is visibly fun enough to justify it.
