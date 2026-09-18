# Parking Remaster — Chat Execution Rules v2

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
11. **Atomic means logical change, not artificial byte slicing.** Keep code/behavior changes small, but do not turn one immutable binary asset into dozens of user-visible turns merely for transport.
12. **Binary transport rule.** For immutable assets under GitHub's normal Git-object range, prefer Git Data API blob/tree/commit writes plus objective hash verification. Do not use the Contents API when it has already shown truncation for the payload.
13. **Batch transport fallback.** If the Chat/tool payload envelope prevents one-shot binary upload, use the largest already-proven safe transport pack, then verify each pack by Git blob SHA. Do not default back to 20,000-character micro-chunks.
14. **Automate deterministic assembly.** When transport packs are needed, reconstruction/decoding/hash checks should be performed by a committed deterministic script or CI workflow, not by repeated manual Chat turns.
15. **Fail closed on assets.** No generated substitute, alternate image, silent recompression, or unverified conversion may replace a canonical visual asset. Final binary size/hash must match the canonical manifest before QA advances.
16. **Research-before-execution rule.** Before any non-trivial gate, determine whether current official documentation, proven implementation patterns, successful comparable projects, or known failure modes could materially improve speed, feasibility, robustness, or quality. If yes, research first and incorporate the best-supported method before mutating the project.
17. **No knowingly inefficient transport/workflow.** Never choose a repetitive manual method when an equally safe deterministic batch, API, script, CI, or native platform operation can do the same work faster and with objective verification.
18. **Quality and feasibility are co-equal gates.** A method is not acceptable merely because it works; it must also preserve the approved visual/gameplay target, be realistically maintainable in this Chat-driven workflow, and have an objective QA path.
19. **Re-evaluate on friction.** If a gate shows repeated truncation, retries, manual repetition, or unexplained delay, stop that method after one bounded repair attempt, research the better route, and change the process before continuing.
20. **Evidence over improvisation.** Prefer official documentation, reproducible benchmarks, established engineering practices, and successful comparable products over ad-hoc invention. Record material process corrections in this file or BUILD_STATE so they survive Chat handoff.

## Research-before-execution rule
For every substantive Parking Remaster step, the assistant must continuously ask: “Is there a faster, safer, higher-quality established way to do this?” Research is required whenever the answer could plausibly be yes. Research must serve execution—not delay it—and should end in a concrete implementation choice, validator, benchmark, or QA criterion.

## Fixed gate order
G0 rules locked -> G1 canonical assets reconstructed/verified locally -> G2 master attached to staging -> G3 atlas attached to staging -> G4 asset-load/render verification -> G5 interaction QA -> G6 full-solve/restart/viewport QA -> G7 main release -> G8 Pages verification.


## Macro-gate alignment rule
21. **Every micro-task must advance a Production Blueprint gate.** Before implementation, identify the current macro phase and the exact gate risk being retired. If a task does not materially advance that gate, defer it.
22. **Do not let local blockers become the roadmap.** Asset transfer, refactors, CI plumbing, format conversion, or other technical chores may consume only the effort justified by the current macro gate. Escalate to a better method or defer if they begin dominating project time.
23. **Scale only after proof.** Content volume, meta systems, monetization, LiveOps, and production tooling must not start merely because they are foreseeable. They begin only when the prior gate's player/product risk is objectively retired.
24. **Research the whole system, not only the current bug.** Maintain parallel research on proven studio production practice, player behavior, level design, technical architecture, distribution constraints, and launch validation. Convert useful findings into the Production Blueprint, validators, or gate criteria.
25. **Vertical Slice before Production.** Parking Remaster remains in pre-production until the representative Vertical Slice gate passes. A polished Level 1 or completed asset transfer alone does not authorize full production.


## Self-triggered handoff rule
26. **The assistant owns Chat handoff timing.** The user is not expected to know or monitor the Chat/context limit. Before context complexity threatens continuity, the assistant must proactively produce a formal HANDOFF PACKAGE/prompt for the next Chat without waiting to be asked.
27. **Handoff before degradation, not after truncation.** A handoff must preserve current CANON, repository/branch, completed commits, current macro phase, open risks, exact gate status, blockers, verification evidence, and the single best next action.
28. **Do not interrupt productive work prematurely.** Continue in the current Chat while context remains reliable; trigger handoff only when it materially protects continuity and execution quality.
