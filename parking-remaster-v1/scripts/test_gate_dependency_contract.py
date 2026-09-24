#!/usr/bin/env python3
"""Fail-closed dependency regression for the finite Parking Remaster gate registry."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATES = ROOT / "project-state" / "GATES.json"
CONTRACT = ROOT / "qa" / "GATE_DEPENDENCY_CONTRACT_V1.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(gates_doc, contract):
    gates = {g["id"]: g for g in gates_doc["gates"]}
    active = set(contract["status_semantics"]["active_statuses"])
    for downstream, prereqs in contract["dependencies"].items():
        assert downstream in gates, f"dependency contract references missing gate {downstream}"
        for prereq in prereqs:
            assert prereq in gates, f"dependency contract references missing prerequisite {prereq}"
        if gates[downstream]["status"] in active:
            bad = [p for p in prereqs if gates[p]["status"] != "PASS"]
            assert not bad, f"{downstream} active before prerequisites PASS: {bad}"

    # Current USER-HOLD is explicit and must not be weakened by this machine contract.
    assert gates["P1-006"]["status"] == "IN_PROGRESS", "P1-006 USER-HOLD unexpectedly changed"
    assert gates["P1-007"]["status"] == "BLOCKED", "P1-007 must remain blocked during P1-006 USER-HOLD"
    assert gates["P1-008"]["status"] == "BLOCKED", "P1-008 must remain blocked before P1-007 PASS"


def must_fail(gates_doc, contract, gate_id, status):
    mutated = json.loads(json.dumps(gates_doc))
    for gate in mutated["gates"]:
        if gate["id"] == gate_id:
            gate["status"] = status
            break
    try:
        validate(mutated, contract)
    except AssertionError:
        return
    raise AssertionError(f"dependency guard accepted unauthorized {gate_id}={status}")


def main():
    gates_doc, contract = load(GATES), load(CONTRACT)
    validate(gates_doc, contract)
    # Representative negative fixtures across core-fun, Vertical Slice, factory and launch chain.
    for gate_id in ("P1-008", "P2-001", "P3-001", "P6-001", "P8-001"):
        must_fail(gates_doc, contract, gate_id, "IN_PROGRESS")
    print("PASS: finite gate dependency contract is fail-closed")


if __name__ == "__main__":
    main()
