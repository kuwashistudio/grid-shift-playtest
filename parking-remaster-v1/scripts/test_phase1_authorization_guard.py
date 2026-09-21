#!/usr/bin/env python3
"""Fail-closed regression guard for Phase-1 gameplay authorization.

This is intentionally state-only: it does not authorize gameplay. It prevents a
future automation from treating blocked downstream gates as permission to build.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATES = ROOT / "project-state" / "GATES.json"
STATE = ROOT / "project-state" / "PROJECT_STATE.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def assert_authorization(gates_doc, state):
    gates = {g["id"]: g for g in gates_doc["gates"]}
    required = ["P1-006", "P1-007", "P1-008", "P1-009"]
    missing = [gid for gid in required if gid not in gates]
    assert not missing, f"missing finite Phase-1 gates: {missing}"

    # Human audio gate remains the only current gate until explicit user review.
    if gates["P1-006"]["status"] != "PASS":
        assert state["current_gate"] == "P1-006", "must remain at P1-006 while Human Review is open"
        assert gates["P1-007"]["status"] == "BLOCKED", "P1-007 must be blocked before P1-006 PASS"

    # Multi-car work is never authorized merely because preparation/evidence exists.
    if gates["P1-007"]["status"] != "PASS":
        assert gates["P1-008"]["status"] == "BLOCKED", "P1-008 must be blocked before P1-007 PASS"
    if gates["P1-008"]["status"] != "PASS":
        assert gates["P1-009"]["status"] == "BLOCKED", "P1-009 must be blocked before P1-008 PASS"

    # Bulk Vertical Slice remains downstream of rebuilt Level 1 proof.
    if gates["P1-009"]["status"] != "PASS":
        assert gates["P2-001"]["status"] == "BLOCKED", "P2-001 must be blocked before P1-009 PASS"


def main():
    gates_doc, state = load(GATES), load(STATE)
    assert_authorization(gates_doc, state)

    # Negative regression: accidental P1-008 activation must fail while P1-007 is blocked.
    mutated = json.loads(json.dumps(gates_doc))
    for gate in mutated["gates"]:
        if gate["id"] == "P1-008":
            gate["status"] = "IN_PROGRESS"
    try:
        assert_authorization(mutated, state)
    except AssertionError:
        pass
    else:
        raise AssertionError("guard accepted unauthorized P1-008 activation")

    print("PASS: Phase-1 authorization chain is fail-closed")


if __name__ == "__main__":
    main()
