#!/usr/bin/env python3
"""Fail-closed regression guard for P1-006/P1-007 physical-iPhone Human acceptance.

This test validates the evidence boundary only. It must never infer Human PASS.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "qa" / "P1_006_007_HUMAN_ACCEPTANCE_CONTRACT_V1.json"
GATES = ROOT / "project-state" / "GATES.json"
STATE = ROOT / "project-state" / "PROJECT_STATE.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(contract, gates_doc, state, acceptance=None):
    errors = []
    by_id = {g["id"]: g for g in gates_doc["gates"]}
    p6, p7 = by_id["P1-006"], by_id["P1-007"]
    record_path = ROOT.parent / contract["acceptance_record"]["path"]
    has_record = acceptance is not None or record_path.exists()
    record = acceptance if acceptance is not None else (load(record_path) if record_path.exists() else None)

    if p6["status"] == "PASS" and not has_record:
        errors.append("P1-006 PASS requires explicit physical-iPhone Human acceptance record")
    if p7["status"] in {"IN_PROGRESS", "PASS"} and p6["status"] != "PASS":
        errors.append("P1-007 cannot activate before P1-006 PASS")
    if p7["status"] == "PASS" and not has_record:
        errors.append("P1-007 PASS requires explicit physical-iPhone Human acceptance record")

    if record is not None:
        spec = contract["acceptance_record"]
        for field in spec["required_fields"]:
            if field not in record or record[field] in (None, ""):
                errors.append(f"acceptance record missing {field}")
        for field, expected in spec["required_values"].items():
            if record.get(field) != expected:
                errors.append(f"acceptance {field} must be {expected!r}")

    if "PENDING" in str(state.get("human_review_status", "")).upper() and p6["status"] == "PASS":
        errors.append("pending human_review_status cannot coexist with P1-006 PASS")
    return errors


def clone(obj): return json.loads(json.dumps(obj))


def main():
    contract, gates, state = load(CONTRACT), load(GATES), load(STATE)
    assert contract["acceptance_record"]["must_be_created_only_after_user_feedback"] is True
    assert "P1-008" in " ".join(contract["promotion_rules"])
    assert "V7.4" in " ".join(contract["promotion_rules"])
    assert validate(contract, gates, state) == [], validate(contract, gates, state)

    # Negative: CI/browser evidence cannot silently promote P1-006.
    bad = clone(gates); next(g for g in bad["gates"] if g["id"] == "P1-006")["status"] = "PASS"
    assert any("acceptance record" in e for e in validate(contract, bad, state))

    # Negative: P1-007 cannot activate while P1-006 is pending.
    bad = clone(gates); next(g for g in bad["gates"] if g["id"] == "P1-007")["status"] = "IN_PROGRESS"
    assert any("before P1-006" in e for e in validate(contract, bad, state))

    # Negative: even an explicit record fails if it is not physical-iPhone user Human PASS.
    fake = {f: "x" for f in contract["acceptance_record"]["required_fields"]}
    fake.update({"device_class":"browser","review_source":"assistant","reviewed_prototype":"V7.3","p1_006_audio_judgment":"PASS","p1_007_joint_feel_judgment":"PASS","motion_regression_judgment":"NO_REGRESSION"})
    assert any("physical_iPhone" in e or "user_human_review" in e for e in validate(contract, gates, state, fake))

    print("P1_006_007_HUMAN_ACCEPTANCE_CONTRACT: PASS (boundary only; no Human gate promoted)")
    return 0

if __name__ == "__main__": raise SystemExit(main())
