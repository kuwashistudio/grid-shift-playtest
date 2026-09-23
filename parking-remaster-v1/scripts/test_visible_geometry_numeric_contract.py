#!/usr/bin/env python3
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "qa" / "VISIBLE_GEOMETRY_NUMERIC_CONTRACT_V1.json"
GATES = ROOT / "project-state" / "GATES.json"


def validate(c, gates):
    errors = []
    by_id = {g["id"]: g for g in gates["gates"]}
    guard = c.get("activation_guard", {})
    if guard.get("required_gate") != "P1-007" or guard.get("required_status") != "PASS":
        errors.append("activation must require P1-007 PASS")
    if guard.get("current_authorization") and by_id.get("P1-007", {}).get("status") != "PASS":
        errors.append("authorization bypasses P1-007")
    space = c.get("canonical_space", {})
    if space.get("name") != "LEVEL_LOGICAL_SPACE": errors.append("logical space must be canonical")
    if space.get("finite_numbers_only") is not True: errors.append("finite numbers required")
    if space.get("integer_source_coordinates") is not True: errors.append("integer source geometry required")
    if space.get("minimum_clearance_units", 0) < 1: errors.append("positive logical clearance required")
    boundary = c.get("boundary_semantics", {})
    if boundary.get("touching_counts_as_blocked") is not True: errors.append("touch semantics drift")
    if boundary.get("epsilon_legality_fudge_forbidden") is not True: errors.append("epsilon legality fudge forbidden")
    projection = c.get("presentation_projection", {})
    if projection.get("round_before_legality_forbidden") is not True: errors.append("presentation rounding may not decide legality")
    if projection.get("viewport_or_scroll_must_not_change_legality") is not True: errors.append("viewport-independent legality required")
    if "timestamp" not in projection.get("animation_rule", "").lower(): errors.append("timestamp-driven animation required")
    if len(c.get("future_runtime_evidence_required", [])) < 5: errors.append("runtime evidence set incomplete")
    if not any("does not authorize" in x for x in c.get("forbidden_claims", [])): errors.append("authorization claim boundary missing")
    return errors


def main():
    c = json.loads(CONTRACT.read_text())
    g = json.loads(GATES.read_text())
    assert not validate(c, g), validate(c, g)
    bad = copy.deepcopy(c); bad["activation_guard"]["current_authorization"] = True
    assert "authorization bypasses P1-007" in validate(bad, g)
    bad = copy.deepcopy(c); bad["boundary_semantics"]["touching_counts_as_blocked"] = False
    assert "touch semantics drift" in validate(bad, g)
    bad = copy.deepcopy(c); bad["presentation_projection"]["round_before_legality_forbidden"] = False
    assert "presentation rounding may not decide legality" in validate(bad, g)
    bad = copy.deepcopy(c); bad["presentation_projection"]["viewport_or_scroll_must_not_change_legality"] = False
    assert "viewport-independent legality required" in validate(bad, g)
    print("PASS visible geometry numeric contract + fail-closed regressions")

if __name__ == "__main__": main()
