#!/usr/bin/env python3
"""Validate Parking Remaster persistent project-state consistency.

Stdlib-only and intentionally limited to machine-checkable invariants. Human quality
judgments (especially P1-006 audio feel) are never inferred or promoted here.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
STATE_DIR = ROOT / "project-state"
STATE_PATH = STATE_DIR / "PROJECT_STATE.json"
GATES_PATH = STATE_DIR / "GATES.json"
CANON_PATH = STATE_DIR / "CANON.md"
ALLOWED = {"TODO", "IN_PROGRESS", "BLOCKED", "PASS"}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    for path in (STATE_PATH, GATES_PATH, CANON_PATH):
        if not path.exists():
            fail(errors, f"missing canonical state file: {path.relative_to(ROOT)}")
    if errors:
        print("PROJECT_STATE_VALIDATION: FAIL")
        for e in errors:
            print(f"- {e}")
        return 1

    state = load_json(STATE_PATH)
    registry = load_json(GATES_PATH)
    gates = registry.get("gates", [])
    ids = [g.get("id") for g in gates]
    if len(ids) != len(set(ids)):
        fail(errors, "gate ids must be unique")

    by_id = {g.get("id"): g for g in gates}
    for gate in gates:
        gid = gate.get("id")
        status = gate.get("status")
        if status not in ALLOWED:
            fail(errors, f"{gid}: invalid status {status!r}")
        if not gate.get("acceptance_criteria"):
            fail(errors, f"{gid}: acceptance_criteria must be non-empty")
        if status == "BLOCKED" and not gate.get("blocker"):
            fail(errors, f"{gid}: BLOCKED gate must explain blocker")
        if status == "PASS" and not gate.get("evidence"):
            fail(errors, f"{gid}: PASS gate must have evidence")

    computed = {s: sum(1 for g in gates if g.get("status") == s) for s in ALLOWED}
    computed["total"] = len(gates)
    if registry.get("counts") != computed:
        fail(errors, f"GATES counts mismatch: stored={registry.get('counts')} computed={computed}")
    if state.get("gate_counts") != computed:
        fail(errors, f"PROJECT_STATE gate_counts mismatch: stored={state.get('gate_counts')} computed={computed}")

    current = state.get("current_gate")
    if current not in by_id:
        fail(errors, f"current_gate {current!r} not found in registry")
    elif by_id[current].get("status") not in {"IN_PROGRESS", "BLOCKED"}:
        fail(errors, f"current_gate {current} has non-active status {by_id[current].get('status')}")

    last = state.get("last_completed_gate")
    if last not in by_id or by_id.get(last, {}).get("status") != "PASS":
        fail(errors, f"last_completed_gate {last!r} must reference a PASS gate")

    nxt = state.get("next_gate")
    if nxt not in by_id:
        fail(errors, f"next_gate {nxt!r} not found in registry")

    # USER-HOLD invariant: automation must never convert P1-006 into a synthetic PASS.
    audio = by_id.get("P1-006")
    if audio:
        if audio.get("status") == "PASS" and "PENDING" in str(state.get("human_review_status", "")).upper():
            fail(errors, "P1-006 cannot PASS while human_review_status is pending")
        if audio.get("status") == "PASS" and not any("user" in str(e).lower() or "iphone" in str(e).lower() for e in audio.get("evidence", [])):
            fail(errors, "P1-006 PASS requires explicit user/physical-iPhone evidence")

    if state.get("production_started") is False:
        # Production-scale gates must not silently become active before the core-fun path opens them.
        for gid in ("P2-001", "P2-002", "P3-001", "P4-001", "P5-001", "P6-001", "P7-001", "P8-001"):
            if gid in by_id and by_id[gid].get("status") not in {"BLOCKED", "TODO"}:
                fail(errors, f"{gid} cannot be active/PASS while production_started=false")

    if errors:
        print("PROJECT_STATE_VALIDATION: FAIL")
        for e in errors:
            print(f"- {e}")
        return 1

    print("PROJECT_STATE_VALIDATION: PASS")
    print(f"gates={computed['total']} pass={computed['PASS']} in_progress={computed['IN_PROGRESS']} blocked={computed['BLOCKED']} todo={computed['TODO']}")
    print(f"current_gate={current} next_gate={nxt} human_review={state.get('human_review_status')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
