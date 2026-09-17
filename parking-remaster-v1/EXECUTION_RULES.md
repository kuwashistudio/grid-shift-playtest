# Parking Remaster — Chat Execution Rules v1

These rules are mandatory for the remainder of this build.

1. **One atomic gate per turn.** A normal `進めて` advances exactly one verified gate, then reports immediately.
2. **Small work units only.** If a gate is likely to need more than ~10 minutes, more than 3 dependent tool phases, or multiple fallback strategies, split it before starting.
3. **No silent waiting.** Never imply work continues after the reply. A turn ends only after a verified checkpoint or an explicit blocker.
4. **No strategy drift.** Keep the approved visual master and current HTML5 + master background + sprite-atlas architecture. No 3D pivot, redesign, or new gameplay mechanic during this build.
5. **Preflight before mutation.** Before each write, confirm exact branch, path, expected input, and rollback point. GRID SHIFT production files are out of scope.
6. **Verify before advancing.** Every gate needs objective evidence: file exists, expected size/hash/content, render result, or functional test. Failed verification means the next gate does not start.
7. **One repair attempt inside the same method.** If a tool step fails, make one bounded repair attempt without changing architecture. If still unresolved, record the exact blocker/checkpoint and report immediately.
8. **Persistent resume point.** After each completed gate, update `BUILD_STATE.md` or a committed manifest so the next turn resumes deterministically.
9. **Staging first, main last.** All work stays on `parking-remaster-v1-staging-20260917` until all QA gates pass. Main is touched only once at release.
10. **User wait protection.** Do not bundle several long gates into one turn. Prefer a fast verified result now over a large unverified batch later.

## Fixed gate order
G0 rules locked -> G1 canonical assets reconstructed/verified locally -> G2 master attached to staging -> G3 atlas attached to staging -> G4 asset-load/render verification -> G5 interaction QA -> G6 full-solve/restart/viewport QA -> G7 main release -> G8 Pages verification.
